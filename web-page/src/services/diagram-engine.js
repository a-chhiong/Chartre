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