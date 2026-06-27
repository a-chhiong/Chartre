import { createHighlighter, createCssVariablesTheme } from 'shiki';
import { buildRegistry, detectDiagramType } from './syntax-registry.js';

const chartreTheme = createCssVariablesTheme({
    name: 'chartre-theme',
    variablePrefix: '--syntax-',
    fontStyle: false
});

let shikiHighlighter = null;
let initializationPromise = null;

const MERMAID_DIAGRAM_FILES = [
    'mermaid-architecture.tmLanguage.json',
    'mermaid-block.tmLanguage.json',
    'mermaid-c4Diagram.tmLanguage.json',
    'mermaid-classDiagram.tmLanguage.json',
    'mermaid-erDiagram.tmLanguage.json',
    'mermaid-flowchart.tmLanguage.json',
    'mermaid-gantt.tmLanguage.json',
    'mermaid-gitGraph.tmLanguage.json',
    'mermaid-info.tmLanguage.json',
    'mermaid-journey.tmLanguage.json',
    'mermaid-kanban.tmLanguage.json',
    'mermaid-markdown.json',
    'mermaid-mindmap.tmLanguage.json',
    'mermaid-packet.tmLanguage.json',
    'mermaid-pie.tmLanguage.json',
    'mermaid-quadrantChart.tmLanguage.json',
    'mermaid-radar.tmLanguage.json',
    'mermaid-requirementDiagram.tmLanguage.json',
    'mermaid-sankeyDiagram.tmLanguage.json',
    'mermaid-sequenceDiagram.tmLanguage.json',
    'mermaid-stateDiagram.tmLanguage.json',
    'mermaid-timeline.tmLanguage.json',
    'mermaid-xychart.tmLanguage.json',
    'mermaid-zenuml.tmLanguage.json'
];

async function fetchGrammarAsset(filename) {
    try {
        const baseUrl = import.meta.env.BASE_URL.endsWith('/') 
            ? import.meta.env.BASE_URL 
            : `${import.meta.env.BASE_URL}/`;

        const response = await fetch(`${baseUrl}syntaxes/${filename}`);
        if (!response.ok) {
            throw new Error(`HTTP status ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        console.error(`Failed to fetch grammar asset [${filename}]:`, err);
        return null;
    }
}

/**
 * Initializes and compiles the TextMate engine core.
 * Explicitly returns an awaitable Promise.
 */
export async function ensureTextMateEngine() {
    if (shikiHighlighter) return shikiHighlighter;
    
    if (!initializationPromise) {
        initializationPromise = (async () => {
            console.log('⏳ Warming up Shiki WebAssembly TextMate engine...');
            
            const [plantumlJson, masterMermaidJson] = await Promise.all([
                fetchGrammarAsset('plantuml.tmLanguage.json'),
                fetchGrammarAsset('mermaid.tmLanguage.json')
            ]);

            const fetchedSubGrammars = await Promise.all(
                MERMAID_DIAGRAM_FILES.map(file => fetchGrammarAsset(file))
            );

            const validSubGrammars = fetchedSubGrammars.map((g, idx) => {
                if (!g) return null;
                const fallbackName = MERMAID_DIAGRAM_FILES[idx].replace('.tmLanguage.json', '').replace('.json', '');
                return {
                    ...g,
                    name: fallbackName,
                    id: fallbackName,
                    scopeName: g.scopeName || `source.mermaid.${fallbackName.replace('mermaid-', '')}`
                    // No injectTo — each sub-grammar is registered as a standalone language
                };
            }).filter(g => g !== null);

            // Build the syntax registry from grammar-declared typeKeywords
            buildRegistry(validSubGrammars);

            const languagesToRegister = [];
            
            if (plantumlJson) {
                languagesToRegister.push({
                    ...plantumlJson,
                    name: 'plantuml',
                    id: 'plantuml',
                    scopeName: plantumlJson.scopeName || 'source.puml'
                });
            }
            
            if (masterMermaidJson) {
                languagesToRegister.push({
                    ...masterMermaidJson,
                    name: 'mermaid',
                    id: 'mermaid',
                    scopeName: masterMermaidJson.scopeName || 'source.mermaid'
                });
            }

            shikiHighlighter = await createHighlighter({
                themes: [chartreTheme],
                langs: [
                    ...languagesToRegister,
                    ...validSubGrammars
                ]
            });

            console.log('🎉 TextMate compiler suite initialized completely with VS Code grammars!');
            return shikiHighlighter;
        })();
    }
    return initializationPromise;
}

/**
 * TextMate auto-gear highlighter.
 * Pass raw code in — detection, grammar selection, and tokenization are all handled internally.
 * Returns a plain HTML string with inline CSS variable styles (no Lit dependency).
 * 
 * @param {string} code - Raw diagram source code
 * @returns {string} HTML string of highlighted spans, or escaped plain text fallback
 */
export function highlightTextMate(code) {
    const workingCode = code || '';
    const formattedFallback = workingCode.endsWith('\n') ? workingCode + ' ' : workingCode;

    // Guard 1: Return safe plain fallback if Shiki is not initialized yet
    if (!shikiHighlighter) {
        return escapeHtml(formattedFallback);
    }

    // Auto-detect the language from the code
    const detection = detectDiagramType(workingCode);
    const languageId = detection.languageId;

    if (!languageId) {
        return escapeHtml(formattedFallback);
    }

    try {
        // Resolve effective language with fallback chain
        const loadedLangs = shikiHighlighter.getLoadedLanguages();
        let effectiveLang = languageId;

        if (!loadedLangs.includes(languageId)) {
            // Fallback: if the specific mermaid sub-grammar isn't loaded, try master
            if (languageId.startsWith('mermaid') && loadedLangs.includes('mermaid')) {
                effectiveLang = 'mermaid';
            } else {
                return escapeHtml(formattedFallback);
            }
        }

        // codeToHtml returns a full <pre><code>...</code></pre> wrapper.
        // We only need the inner token spans, so we strip the outer elements.
        const htmlOutput = shikiHighlighter.codeToHtml(formattedFallback, {
            lang: effectiveLang,
            theme: 'chartre-theme'
        });

        // Extract content inside <code>...</code>
        const codeMatch = htmlOutput.match(/<code[^>]*>([\s\S]*)<\/code>/);
        return codeMatch ? codeMatch[1] : escapeHtml(formattedFallback);

    } catch (err) {
        console.error(`Synchronous tokenization failed for language [${languageId}]:`, err);
        return escapeHtml(formattedFallback);
    }
}

/** Minimal HTML escaping for plain-text fallback */
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}