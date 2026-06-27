/**
 * Syntax Registry — the single source of truth for diagram type detection.
 * 
 * This module owns the keyword→languageId mapping, derived directly from
 * the tmLanguage grammar files at runtime. No circular dependencies:
 * both diagram-engine.js and textmate-engine.js depend on this module,
 * but this module depends on neither.
 * 
 * Architecture:
 *   PlantUML  → monolithic grammar, single languageId 'plantuml'
 *   Mermaid   → plural grammars, each sub-grammar has its own languageId
 *              (e.g. 'mermaid-erDiagram', 'mermaid-flowchart')
 */

// ─── Registry State ─────────────────────────────────────────────────────────

/** @type {Map<string, string>|null} keyword → languageId (e.g. 'erDiagram' → 'mermaid-erDiagram') */
let mermaidKeywordMap = null;

/** @type {boolean} */
let registryReady = false;

// ─── Registry Construction ──────────────────────────────────────────────────

/**
 * Extracts diagram type trigger keywords from a grammar's typeKeywords repository.
 * Parses the regex alternation: \\b(keyword1|keyword2|keyword3)\\b → ['keyword1', 'keyword2', 'keyword3']
 * 
 * @param {object} grammarJson - The parsed tmLanguage JSON
 * @returns {string[]} Array of trigger keywords declared by this grammar
 */
export function extractTypeKeywords(grammarJson) {
    const patterns = grammarJson?.repository?.typeKeywords?.patterns;
    if (!Array.isArray(patterns)) return [];

    const keywords = [];
    for (const pattern of patterns) {
        if (!pattern.match) continue;

        // Match the alternation group inside \b(...)\b or standalone (...)
        const altMatch = pattern.match.match(/\(([^)]+)\)/);
        if (altMatch) {
            const alternatives = altMatch[1].split('|');
            for (const alt of alternatives) {
                // Strip residual regex escape artifacts
                const clean = alt.replace(/\\\\/g, '\\').replace(/\\-/g, '-').trim();
                if (clean) keywords.push(clean);
            }
        } else {
            // Single keyword without alternation: \\b(keyword)\\b or just \\bkeyword\\b
            const singleMatch = pattern.match.match(/\\b\(?([^)\\]+)\)?\\b/);
            if (singleMatch) {
                const clean = singleMatch[1].trim();
                if (clean) keywords.push(clean);
            }
        }
    }
    return keywords;
}

/**
 * Builds the keyword→languageId registry from an array of processed sub-grammar objects.
 * Called once by textmate-engine.js after all grammar files are fetched and parsed.
 * 
 * @param {Array<{id: string, repository?: object}>} subGrammars - Processed sub-grammar objects with `id` set to their languageId
 */
export function buildRegistry(subGrammars) {
    mermaidKeywordMap = new Map();

    for (const grammar of subGrammars) {
        const keywords = extractTypeKeywords(grammar);
        for (const keyword of keywords) {
            mermaidKeywordMap.set(keyword, grammar.id);
        }
    }

    registryReady = true;
    console.log(`📖 Syntax registry built: ${mermaidKeywordMap.size} Mermaid keywords mapped to ${subGrammars.length} grammars`);
}

/**
 * @returns {boolean} Whether the registry has been built
 */
export function isRegistryReady() {
    return registryReady;
}

/**
 * @returns {Map<string, string>|null} The raw keyword map (for debugging/inspection)
 */
export function getKeywordMap() {
    return mermaidKeywordMap;
}

// ─── Detection ──────────────────────────────────────────────────────────────

/**
 * @typedef {object} DiagramDetection
 * @property {'plantuml'|'mermaid'|null} family - The diagram engine family
 * @property {string|null} languageId - The Shiki language ID for syntax highlighting
 */

/**
 * Detects diagram type and resolves the correct Shiki languageId.
 * Detection is grammar-derived: keywords come from the tmLanguage files themselves.
 * 
 * Detection layers (ordered by confidence):
 *  1. PlantUML: @start prefix — unambiguous, absolute certainty
 *  2. Mermaid subtype: first meaningful token matched against grammar-derived keyword registry
 *  3. Mermaid fallback: if token looks mermaid-ish but isn't in registry (future-proofing)
 *  4. null: unrecognized
 * 
 * @param {string} code - Raw diagram source code
 * @returns {DiagramDetection}
 */
export function detectDiagramType(code) {
    if (!code || !code.trim()) {
        return { family: null, languageId: null };
    }

    // ── Head Cleaning ──
    // Strip leading whitespace, YAML frontmatter, Mermaid config directives, and comment lines.
    // Only inspects the beginning of the input — never scans the full document.
    const headCleanerRegex = /^\s*(?:---[\s\S]*?---\s*)?(?:%%\{[\s\S]*?\}%%\s*)?(?:%%[^\n]*\n\s*)*/;
    const headMatch = code.match(headCleanerRegex);
    const startIndex = headMatch ? headMatch[0].length : 0;

    // Sample a safe bounded window from the cleaned head
    const sampleHead = code.substring(startIndex, startIndex + 300).trim();
    if (!sampleHead) {
        return { family: null, languageId: null };
    }

    // ── Layer 1: PlantUML ──
    // @start* prefix is globally unique to PlantUML. No ambiguity possible.
    if (/^@start[a-z]/i.test(sampleHead)) {
        return { family: 'plantuml', languageId: 'plantuml' };
    }

    // ── Layer 2: Mermaid — grammar-derived keyword lookup ──
    // Extract the first coherent token (supports hyphenated keywords like 'xychart-beta')
    const firstTokenMatch = sampleHead.match(/^[a-zA-Z][a-zA-Z0-9_-]*/);
    if (firstTokenMatch) {
        const token = firstTokenMatch[0];

        // Primary: exact match in grammar-derived registry
        if (mermaidKeywordMap && mermaidKeywordMap.has(token)) {
            return { family: 'mermaid', languageId: mermaidKeywordMap.get(token) };
        }

        // ── Layer 3: Fallback heuristic ──
        // If the registry is ready but the keyword wasn't found, try known base keywords
        // that might exist in the master grammar but not in any sub-grammar's typeKeywords.
        // This handles edge cases and future diagram types gracefully.
        if (registryReady) {
            const masterFallbackKeywords = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|mindmap|timeline|quadrantChart|xychart|architecture|sankey|requirementDiagram|zenuml|block|kanban|info|packet|radar)\b/;
            if (masterFallbackKeywords.test(sampleHead)) {
                return { family: 'mermaid', languageId: 'mermaid' };
            }
        }

        // ── Layer 4: Pre-registry fallback ──
        // If the registry hasn't been built yet (async race), use a basic heuristic
        // so detection still works during the loading window.
        if (!registryReady) {
            const earlyHeuristic = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|erDiagram|gantt|pie|gitGraph|journey|mindmap|timeline|quadrantChart|xychart-beta|architecture-beta|architecture|sankey-beta|requirementDiagram|zenuml|block-beta|kanban|info|packet-beta|radar-beta|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)\b/;
            if (earlyHeuristic.test(sampleHead)) {
                return { family: 'mermaid', languageId: 'mermaid' };
            }
        }
    }

    return { family: null, languageId: null };
}
