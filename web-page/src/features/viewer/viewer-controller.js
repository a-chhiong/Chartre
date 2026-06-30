/* global __PLANTUML_VERSION__, __PLANTUML_COMMIT__, __PLANTUML_BUILD_TIME__ */
import { renderDiagram } from '../../services/diagram-engine.js';

export class ViewerController {
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

    async _onThemeChanged() {
        // Re-compile the current diagram with the updated theme colors
        const code = this.host.umlCode?.trim();
        if (code && !this.compiling) {
            this.compile(code);
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

        this.compiling = true;
        this.error = null;
        this.host.requestUpdate();
        this._dispatchStatus('Compiling...', false);

        // Safety timeout to prevent infinite loader
        if (this._compileTimeout) {
            clearTimeout(this._compileTimeout);
        }
        this._compileTimeout = setTimeout(() => {
            if (this.compiling) {
                this._handleCompilationFailure("Compilation Timeout: Diagram engine did not respond in time.");
            }
        }, 8000);

        try {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const result = await renderDiagram(trimmedCode, { dark: isDark });
            if (this._compileTimeout) {
                clearTimeout(this._compileTimeout);
                this._compileTimeout = null;
            }
            let svgOutput = result.svg;
            if (result.family === 'plantuml') {
                svgOutput = svgOutput
                    .replace(/\$version\$/g, __PLANTUML_VERSION__)
                    .replace(/\$git\.commit\.id\$/g, __PLANTUML_COMMIT__)
                    .replace(/Unknown compile time/g, __PLANTUML_BUILD_TIME__);
            }
            this.svgString = svgOutput;
            this.diagramType = result.family;

            // Check for PlantUML embedded syntax errors
            let plantumlErr = null;
            if (result.family === 'plantuml') {
                plantumlErr = extractPlantUMLError(svgOutput);
            }

            if (plantumlErr) {
                this.error = plantumlErr;
                this.compiling = false;
                this.host.requestUpdate();
                this._dispatchStatus('✗ Compilation Error', true);
            } else {
                this.error = null;
                this.compiling = false;
                this.host.requestUpdate();
                this._dispatchStatus('✓ Diagram Ready', false);
            }
        } catch (err) {
            if (this._compileTimeout) {
                clearTimeout(this._compileTimeout);
                this._compileTimeout = null;
            }
            console.error("Diagram compile error:", err);
            this.error = err.message || String(err);
            this.svgString = null;
            this.compiling = false;
            this.host.requestUpdate();
            this._dispatchStatus('✗ Compilation Error', true);
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

/**
 * Extracts the syntax error text from PlantUML SVG output.
 */
function extractPlantUMLError(svgString) {
    if (!svgString) return null;
    
    // PlantUML error diagrams contain specific visual underlines or error location headers:
    // - text-decoration="wavy underline"
    // - [From textarea (line 12) ]
    const hasErrorPattern = svgString.includes('text-decoration="wavy underline"') || 
                            /\[From\s+.+\(line\s+\d+\)\]/i.test(svgString);
    if (!hasErrorPattern) return null;
    
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const textElements = Array.from(doc.querySelectorAll('text'));
        
        // Filter and clean lines
        const lines = textElements
            .map(el => el.textContent.trim())
            .filter(text => text.length > 0);
            
        if (lines.length > 0) {
            return lines.join('\n');
        }
    } catch (e) {
        console.error("Failed to parse PlantUML error SVG:", e);
    }
    
    return "PlantUML Syntax Error (see diagram below for details)";
}
