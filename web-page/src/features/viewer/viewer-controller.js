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
            this.svgString = result.svg;
            this.diagramType = result.family;
            this.error = null;
            this.compiling = false;
            this.host.requestUpdate();
            this._dispatchStatus('✓ Diagram Ready', false);
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
