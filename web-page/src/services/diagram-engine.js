import { html } from 'lit';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike.js';
import 'prismjs/components/prism-plant-uml.js';
import 'prismjs/components/prism-mermaid.js';

// Custom Grammars (Keep your high-fidelity configs exactly as they are)
Prism.languages.plantuml = {
    'comment': { pattern: /(^[ \t]*['\/].*$|\/'[\s\S]*?'\/)/m, greedy: true },
    'keyword': /\b(skinparam|autonumber|participant|actor|boundary|control|entity|database|collections|queue|package|namespace|node|cloud|component|interface|class|state|object|enum|annotation|as|with|show|hide|allow_mixing|left|right|up|down|title|header|footer|legend|end|fork|again|split|alt|else|opt|loop|par|break|critical|group|map|title)\b/i,
    'arrow': { pattern: /(-+>|--+>|<--+|<->|-[xX]>|<-+[xX]|o<-+|-\[#\w+\]->|==>|~>|\.\.>|<-+|-+)/, alias: 'operator' },
    'string': { pattern: /"(?:""|[^"\\]|\\.)*"/, greedy: true },
    'variable': /\b[a-zA-Z_]\w*(?=\s*as\s+|\s*:[^:]|$)/i,
    'punctuation': /[{}[\];(),.:]/
};

Prism.languages.mermaid = {
    'comment': { pattern: /%%.*$/, greedy: true },
    'keyword': /\b(flowchart|sequenceDiagram|erDiagram|gantt|classDiagram|stateDiagram-v2|pie|gitGraph|requirementDiagram|subgraph|end|as|title|accTitle|accDescr|direction|TB|BT|RL|LR|alt|else|opt|loop|par|and|rect|activate|deactivate|note|over|left of|right of)\b/,
    'arrow': { pattern: /(-\.?->|--+|-\.-|==>|==+|-->|->>|-->>|->|-->|--x|-x|o-o)/, alias: 'operator' },
    'string': { pattern: /"(?:""|[^"\\]|\\.)*"/, greedy: true },
    'shape': {
        pattern: /([a-zA-Z0-9_-]+)?(\[\".*?\"\]|\(\".*?\"\)|\{\".*?\"\}|\[.*?\]|\(.*?\)|\[\(.*?\)|\]|([^"\]\)\s]+))/,
        inside: { 'variable': /^[a-zA-Z0-9_-]+/ }
    },
    'punctuation': /[|(){}[\];,:]/
};

/**
 * Recursive Token Renderer that generates structural Lit Templates
 * instead of raw HTML string interpolation.
 */
function renderTokens(tokens) {
    if (typeof tokens === 'string') {
        return tokens; // Native string text node
    }
    
    if (Array.isArray(tokens)) {
        return tokens.map(token => renderTokens(token));
    }

    // It's a Prism Token object
    const classes = `token ${tokens.type} ${tokens.alias || ''}`.trim();
    return html`<span class="${classes}">${renderTokens(tokens.content)}</span>`;
}

/**
 * Highlighting function returning safe Lit template rendering trees
 */
export function highlightCode(code, type) {
    let workingCode = code || '';
    
    // Mitigate textarea trailing line scroll desync
    if (workingCode.endsWith('\n')) {
        workingCode += ' ';
    }

    if (type && Prism.languages[type]) {
        try {
            // Tokenize into an Abstract Syntax Tree (AST) array instead of an HTML string
            const tokens = Prism.tokenize(workingCode, Prism.languages[type]);
            return renderTokens(tokens);
        } catch (err) {
            console.error(`Prism AST Tokenization [${type}] failed:`, err);
        }
    }

    // Default secure textual fallback
    return workingCode;
}

let plantumlLoadingPromise = null;
let plantumlInstance = null;

export function loadPlantUML() {
    if (plantumlInstance) return Promise.resolve(plantumlInstance);
    if (!plantumlLoadingPromise) {
        plantumlLoadingPromise = (async () => {
            // Load the Graphviz layout engine and expose it globally (required by PlantUML)
            const viz = await import('@plantuml/core/viz-global.js');
            window.Viz = viz.default || viz;
            console.log("PlantUML layout engine (window.Viz) initialized:", window.Viz);
            
            // Load the PlantUML core engine
            const module = await import('@plantuml/core');
            plantumlInstance = module.renderToString || module.render;
            return plantumlInstance;
        })();
    }
    return plantumlLoadingPromise;
}

let mermaidLoadingPromise = null;
let mermaidInstance = null;

export function loadMermaid() {
    if (mermaidInstance) return Promise.resolve(mermaidInstance);
    if (!mermaidLoadingPromise) {
        mermaidLoadingPromise = (async () => {
            const module = await import('mermaid');
            mermaidInstance = module.default || module;
            
            // Initialize mermaid with basic options
            mermaidInstance.initialize({
                startOnLoad: false,
                securityLevel: 'loose',
                theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
            });
            return mermaidInstance;
        })();
    }
    return mermaidLoadingPromise;
}

export async function initializeEngines() {
    try {
        await Promise.all([
            loadPlantUML(),
            loadMermaid()
        ]);
        console.log("Diagram engines pre-initialized successfully");
    } catch (err) {
        console.error("Failed to pre-initialize diagram engines:", err);
    }
}

export function detectDiagramType(code) {
    if (!code || !code.trim()) return null;

    // Fast lookups using Set for O(1) matching speed
    const mermaidKeywords = new Set([
        'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 
        'stateDiagram', 'stateDiagram-v2', 'erDiagram', 'gantt', 
        'pie', 'gitGraph', 'journey', 'info', 'mindmap', 'timeline', 
        'quadrantChart', 'xychart-beta', 'architecture', 'sankey-beta', 
        'c4Context', 'requirementDiagram', 'packet-beta', 'kanban', 'block'
    ]);

    // 1. Clean out frontmatter or leading comments/whitespace sequentially at the start
    // This regex looks ONLY at the head of the file. It skips:
    //   - Any leading whitespace/newlines
    //   - YAML frontmatter blocks: --- \n ... \n ---
    //   - Multiple Mermaid comment lines: %% ...
    //   - Multiple PlantUML comment lines: ' ...
    const headCleanerRegex = /^\s*(?:---[\s\S]*?---\s*|%%.*(?:\r?\n\s*)*|'.*(?:\r?\n\s*)*)*/;
    
    const headMatch = code.match(headCleanerRegex);
    const startIndex = headMatch ? headMatch[0].length : 0;
    
    // Slice only a safe subset of the head to inspect, avoiding scanning megabytes of text
    const sampleHead = code.substring(startIndex, startIndex + 200).trim();
    if (!sampleHead) return null;

    // 2. High-accuracy PlantUML Check
    if (sampleHead.startsWith('@start')) {
        return 'plantuml';
    }

    // 3. High-accuracy Mermaid Check
    // Extracts the very first coherent word token from our sample head
    const firstWordMatch = sampleHead.match(/^[a-zA-Z0-9_-]+/);
    if (firstWordMatch && mermaidKeywords.has(firstWordMatch[0])) {
        return 'mermaid';
    }

    return null;
}