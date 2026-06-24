
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

    const trimmed = code.trim();

    // Check for PlantUML
    if (trimmed.includes('@start')) {
        return 'plantuml';
    }

    // Strip comments (%%...) and frontmatter (---...---) to look for Mermaid keywords
    let cleanCode = trimmed;
    
    // Remove frontmatter
    if (cleanCode.startsWith('---')) {
        const nextDash = cleanCode.indexOf('---', 3);
        if (nextDash !== -1) {
            cleanCode = cleanCode.substring(nextDash + 3).trim();
        }
    }
    
    // Remove comments
    cleanCode = cleanCode
        .split('\n')
        .filter(line => !line.trim().startsWith('%%'))
        .join('\n')
        .trim();

    // Common Mermaid keywords
    const mermaidKeywords = [
        'graph',
        'flowchart',
        'sequenceDiagram',
        'classDiagram',
        'stateDiagram',
        'stateDiagram-v2',
        'erDiagram',
        'gantt',
        'pie',
        'gitGraph',
        'journey',
        'info',
        'mindmap',
        'timeline',
        'quadrantChart',
        'xychart-beta',
        'architecture',
        'sankey-beta',
        'c4Context',
        'requirementDiagram',
        'packet-beta',
        'kanban',
        'block'
    ];

    // Get first word/token
    const firstWord = cleanCode.split(/[\s\n\(\[\{\>:]/)[0];
    if (mermaidKeywords.includes(firstWord)) {
        return 'mermaid';
    }

    return null;
}