import { html } from 'lit';
import { createHighlighter, createCssVariablesTheme } from 'shiki';

const chartreTheme = createCssVariablesTheme({
    name: 'chartre-theme',
    variablePrefix: '--code-',
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
                    name: g.name || g.id || fallbackName,
                    id: g.id || g.name || fallbackName,
                    scopeName: g.scopeName || `source.${fallbackName}`
                };
            }).filter(g => g !== null);

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
 * TextMate Synchronous Highlights Parser
 * Maps tokens safely to granular elements once initialization promises resolve.
 */
export function highlightTextMate(code, type) {
    const workingCode = code || '';
    const formattedFallback = workingCode.endsWith('\n') ? workingCode + ' ' : workingCode;

    // Guard 1: Return safe plain fallback text layout if Shiki is not initialized yet
    if (!shikiHighlighter || !type) {
        return formattedFallback;
    }

    try {
        // Guard 2: Confirm the grammar registration is active in the engine's current list
        const loadedLangs = shikiHighlighter.getLoadedLanguages();
        if (!loadedLangs.includes(type)) {
            return formattedFallback;
        }

        const result = shikiHighlighter.codeToTokens(formattedFallback, {
            lang: type,
            theme: 'chartre-theme'
        });

        // Guard 3: Mitigate structural object anomalies
        const lineGrids = Array.isArray(result) ? result : result?.tokens;
        if (!Array.isArray(lineGrids)) {
            return formattedFallback;
        }

        return lineGrids.map((lineTokens, lineIndex) => {
            if (!Array.isArray(lineTokens)) return html`${lineTokens}`;
            
            const spans = lineTokens.map(token => {
                // EXPLICIT GUARD: Prevent stringified 'undefined' properties from leaking into the DOM inline style
                const hasValidColor = token && token.color && token.color !== 'undefined';
                const cssStyleString = hasValidColor ? `color: ${token.color};` : '';
                
                return html`<span class="token" style="${cssStyleString}">${token.content}</span>`;
            });

            return html`${spans}${lineIndex < lineGrids.length - 1 ? '\n' : ''}`;
        });

    } catch (err) {
        console.error(`Synchronous tokenization failed for language format [${type}]:`, err);
        return formattedFallback;
    }
}