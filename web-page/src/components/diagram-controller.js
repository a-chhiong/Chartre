import mermaid from 'mermaid';

// Initialize mermaid with basic options
mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
});

let plantumlRender;
async function loadPlantUMLRenderer() {
    if (!plantumlRender) {
        // Load the Graphviz layout engine and expose it globally (required by PlantUML)
        const viz = await import('@plantuml/core/viz-global.js');
        window.Viz = viz.default || viz;
        console.log("PlantUML layout engine (window.Viz) initialized:", window.Viz);
        
        // Load the PlantUML core engine
        const module = await import('@plantuml/core');
        plantumlRender = module.renderToString || module.render;
    }
    return plantumlRender;
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

export class DiagramCompilerController {
    constructor(host) {
        this.host = host;
        this.host.addController(this);

        this.compiling = false;
        this.error = null;
        this.svgString = null;
        this.diagramType = null; // 'plantuml' | 'mermaid' | null
        this._compileTimeout = null;

        this._onThemeChanged = this._onThemeChanged.bind(this);
        this._onGlobalError = this._onGlobalError.bind(this);
        this._onGlobalRejection = this._onGlobalRejection.bind(this);
    }

    hostConnected() {
        window.addEventListener('theme-changed', this._onThemeChanged);
        window.addEventListener('error', this._onGlobalError);
        window.addEventListener('unhandledrejection', this._onGlobalRejection);
    }

    hostDisconnected() {
        window.removeEventListener('theme-changed', this._onThemeChanged);
        window.removeEventListener('error', this._onGlobalError);
        window.removeEventListener('unhandledrejection', this._onGlobalRejection);
        if (this._compileTimeout) {
            clearTimeout(this._compileTimeout);
            this._compileTimeout = null;
        }
    }

    _onGlobalError(e) {
        if (this.compiling) {
            const errorMsg = e.message || (e.error && e.error.message) || String(e);
            this._handleCompilationFailure(`Uncaught Engine Exception: ${errorMsg}`);
        }
    }

    _onGlobalRejection(e) {
        if (this.compiling) {
            const reason = e.reason;
            const errorMsg = reason ? (reason.message || String(reason)) : "Unhandled promise rejection";
            this._handleCompilationFailure(`Uncaught Promise Rejection: ${errorMsg}`);
        }
    }

    _handleCompilationFailure(errorMsg) {
        console.error("Compilation crash intercepted:", errorMsg);
        this.error = errorMsg;
        this.svgString = null;
        this.compiling = false;
        if (this._compileTimeout) {
            clearTimeout(this._compileTimeout);
            this._compileTimeout = null;
        }
        this.host.requestUpdate();
        this._dispatchStatus('✗ Engine Error', true);
    }

    hostUpdated() {
        const displayDiv = this.host.shadowRoot.querySelector('.notation-display');
        if (displayDiv) {
            if (this.svgString) {
                displayDiv.innerHTML = this.svgString;
            } else {
                displayDiv.innerHTML = '';
            }
        }
    }

    _onThemeChanged(e) {
        const theme = e.detail.theme;
        mermaid.initialize({
            theme: theme === 'dark' ? 'dark' : 'default',
        });
        
        // Recompile if we have code
        if (this.host.umlCode) {
            this.compile(this.host.umlCode);
        }
    }

    async compile(code) {
        const trimmedCode = code?.trim();

        if (!trimmedCode) {
            this.compiling = false;
            this.error = null;
            this.svgString = null;
            this.diagramType = null;
            if (this._compileTimeout) {
                clearTimeout(this._compileTimeout);
                this._compileTimeout = null;
            }
            this.host.requestUpdate();
            this._dispatchStatus('Ready', false);
            return;
        }

        const type = detectDiagramType(trimmedCode);
        this.diagramType = type;
        this.compiling = true;
        this.error = null;
        this.host.requestUpdate();

        this._dispatchStatus('Compiling...', false);

        // Start safety timeout to prevent infinite loader (e.g. if engine blocks or hangs)
        if (this._compileTimeout) {
            clearTimeout(this._compileTimeout);
        }
        this._compileTimeout = setTimeout(() => {
            if (this.compiling) {
                this._handleCompilationFailure("Compilation Timeout: Diagram engine did not respond in time.");
            }
        }, 8000); // 8 seconds safety timeout

        if (type === 'plantuml') {
            try {
                const render = await loadPlantUMLRenderer();
                const lines = trimmedCode.split(/\r\n|\r|\n/);
                const dark = document.documentElement.getAttribute('data-theme') === 'dark';

                render(
                    lines,
                    (svgOutput) => {
                        if (this._compileTimeout) {
                            clearTimeout(this._compileTimeout);
                            this._compileTimeout = null;
                        }
                        this.svgString = svgOutput;
                        this.error = null;
                        this.compiling = false;
                        this.host.requestUpdate();
                        this._dispatchStatus('✓ Diagram Ready', false);
                    },
                    (err) => {
                        if (this._compileTimeout) {
                            clearTimeout(this._compileTimeout);
                            this._compileTimeout = null;
                        }
                        console.error("PlantUML compile error:", err);
                        this.error = err.message || String(err);
                        this.svgString = null;
                        this.compiling = false;
                        this.host.requestUpdate();
                        this._dispatchStatus('✗ Compilation Error', true);
                    },
                    { dark: dark }
                );
            } catch (err) {
                if (this._compileTimeout) {
                    clearTimeout(this._compileTimeout);
                    this._compileTimeout = null;
                }
                console.error("Failed to load/run PlantUML compiler:", err);
                this.error = err.message || String(err);
                this.svgString = null;
                this.compiling = false;
                this.host.requestUpdate();
                this._dispatchStatus('✗ Engine Error', true);
            }
        } else if (type === 'mermaid') {
            try {
                const id = 'mermaid-svg-' + Math.floor(Math.random() * 1000000);
                
                // Clear any leftover mermaid error elements in body
                const badge = document.getElementById('dmermaid-svg');
                if (badge) badge.remove();

                const { svg } = await mermaid.render(id, trimmedCode);
                if (this._compileTimeout) {
                    clearTimeout(this._compileTimeout);
                    this._compileTimeout = null;
                }
                this.svgString = svg;
                this.error = null;
                this.compiling = false;
                this.host.requestUpdate();
                this._dispatchStatus('✓ Diagram Ready', false);
            } catch (err) {
                if (this._compileTimeout) {
                    clearTimeout(this._compileTimeout);
                    this._compileTimeout = null;
                }
                console.error("Mermaid compile error:", err);
                
                // Extract error message
                let msg = err.message || String(err);
                
                // Mermaid sometimes puts error message on element or throws an object
                if (err.str) {
                    msg = err.str;
                }
                
                // Remove the temp div created by mermaid if any
                const tempDiv = document.getElementById('d' + id);
                if (tempDiv) tempDiv.remove();

                this.error = msg;
                this.svgString = null;
                this.compiling = false;
                this.host.requestUpdate();
                this._dispatchStatus('✗ Compilation Error', true);
            }
        } else {
            if (this._compileTimeout) {
                clearTimeout(this._compileTimeout);
                this._compileTimeout = null;
            }
            // Neither detected
            this.svgString = null;
            this.compiling = false;
            
            // Build a helpful syntax guidance message
            this.error = `Unrecognized syntax format.
Please check your syntax:
• PlantUML: Start your diagram with '@startuml' and end with '@enduml'.
• Mermaid: Start with a supported diagram keyword (e.g., 'flowchart TD', 'sequenceDiagram', 'classDiagram', 'stateDiagram-v2').`;
            
            this.host.requestUpdate();
            this._dispatchStatus('✗ Unrecognized Syntax', true);
        }
    }

    _dispatchStatus(status, isError) {
        this.host.dispatchEvent(new CustomEvent('status-changed', {
            detail: { status, isError },
            bubbles: true,
            composed: true
        }));
    }
}
