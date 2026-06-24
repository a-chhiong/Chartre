import { LitElement, html, css } from 'lit';
import LZString from 'lz-string';
import { initializeEngines } from './diagram-controller.js';

export class AppComponent extends LitElement {
    static properties = {
        umlCode: { type: String },
        status: { type: String },
        isError: { type: Boolean },
        splitPercentage: { type: Number },
        isDragging: { type: Boolean },
        isDesktop: { type: Boolean },
        confirmTitle: { type: String, state: true },
        confirmMessage: { type: String, state: true },
        confirmText: { type: String, state: true },
        confirmCancelText: { type: String, state: true },
        confirmVariant: { type: String, state: true },
        isConfirmOpen: { type: Boolean, state: true },
        isLoading: { type: Boolean, state: true },
        progress: { type: Number, state: true }
    };

    static styles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%;
        }

        .app-container {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100vh;
            height: 100dvh;
            background: var(--bg-app-gradient);
            overflow: hidden;
        }

        .app-main {
            display: flex;
            flex: 1;
            min-height: 0;
            overflow: hidden;
            flex-direction: row;
        }

        .editor-area {
            min-width: 0;
            min-height: 0;
            display: flex;
            flex-direction: column;
            background: var(--bg-glass);
            border-right: 1px solid var(--border-color);
        }

        .preview-area {
            min-width: 0;
            min-height: 0;
            display: flex;
            flex-direction: column;
            background: var(--bg-glass);
            border-left: 1px solid var(--border-color);
        }

        /* Sleek Splitter drag bar */
        .app-splitter {
            background: var(--bg-splitter-line);
            position: relative;
            flex-shrink: 0;
            z-index: 5;
            transition: background var(--transition-fast), box-shadow var(--transition-fast);
        }

        .app-splitter:hover,
        .app-splitter.dragging {
            background: var(--accent-violet);
            box-shadow: 0 0 12px rgba(139, 92, 246, 0.6);
        }

        .app-splitter::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 2px;
            height: 24px;
            background: var(--text-secondary);
            border-radius: 99px;
            opacity: 0.8;
            transition: background var(--transition-fast), opacity var(--transition-fast);
            z-index: 6;
            pointer-events: none;
        }

        .app-splitter:hover::before,
        .app-splitter.dragging::before {
            background: var(--text-primary);
            opacity: 1;
        }

        .app-splitter::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10;
        }

        /* Desktop split defaults */
        .app-splitter {
            width: 4px;
            height: 100%;
            cursor: col-resize;
        }

        .app-splitter::after {
            width: 16px;
            height: 100%;
        }

        /* Tablet & Mobile Layout */
        .app-container.layout-mobile .app-main {
            flex-direction: column-reverse;
        }

        .app-container.layout-mobile .app-splitter {
            width: 100%;
            height: 4px;
            cursor: row-resize;
        }

        .app-container.layout-mobile .app-splitter::before {
            width: 24px;
            height: 2px;
            background-image: none;
        }

        .app-container.layout-mobile .app-splitter::after {
            width: 100%;
            height: 16px;
        }

        /* IDE-Style Status Bar at the bottom */
        .app-statusbar {
            height: 22px;
            background: var(--bg-panel-header);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-top: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            padding: 0 10px;
            font-size: 0.7rem;
            color: var(--text-secondary);
            font-family: var(--font-ui);
            gap: 8px;
            user-select: none;
            flex-shrink: 0;
            z-index: 20;
        }

        .status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
            transition: all var(--transition-fast);
        }

        .status-indicator.ready {
            background: var(--accent-emerald);
            box-shadow: 0 0 6px var(--accent-emerald);
        }

        .status-indicator.compiling {
            background: var(--accent-indigo);
            box-shadow: 0 0 6px var(--accent-indigo);
            animation: pulse-indicator 1.5s infinite ease-in-out;
        }

        .status-indicator.error {
            background: var(--accent-rose);
            box-shadow: 0 0 6px var(--accent-rose);
        }

        @keyframes pulse-indicator {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
        }

        app-loader {
            opacity: 1;
            transition: opacity 0.5s ease, visibility 0.5s;
            visibility: visible;
        }
        app-loader.fade-out {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }
    `;

    constructor() {
        super();
        let code = this._loadFromUrl() || this._loadFromStorage() || this._getDefaultUML();

        // Auto-heal local storage if it contains the old buggy welcome text
        if (code && code.includes("note over Renderer: No server requests!\nRuns completely in your browser.")) {
            code = this._getDefaultUML();
            localStorage.setItem('chartreCode', code);
        }

        this.umlCode = code;
        this.status = 'Ready';
        this.isError = false;
        this.splitPercentage = 50; // default 50/50 split
        this.isDragging = false;
        this.isDesktop = this._checkIsDesktop();

        // Confirmation dialog states
        this.confirmTitle = 'Confirm';
        this.confirmMessage = '';
        this.confirmText = 'Confirm';
        this.confirmCancelText = 'Cancel';
        this.confirmVariant = 'primary';
        this.isConfirmOpen = false;
        this._onConfirmCallback = null;

        this.isLoading = true;
        this.progress = 0;
    }

    _checkIsDesktop() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (w >= 1366 && h >= 768) {
            return true;
        }
        return (w / h) >= 1.2;
    }

    connectedCallback() {
        super.connectedCallback();
        this._onWindowResize = () => {
            this.isDesktop = this._checkIsDesktop();
            this.requestUpdate();
        };
        window.addEventListener('resize', this._onWindowResize);

        this._initEngines();
    }

    async _initEngines() {
        const initPromise = initializeEngines();

        // Progress sweeps to 90% organically over approx 2 seconds
        this._progressInterval = setInterval(() => {
            if (this.progress < 90) {
                const inc = Math.random() * 2 + 1;
                this.progress = Math.min(90, this.progress + inc);
            } else {
                clearInterval(this._progressInterval);
            }
        }, 30);

        try {
            await initPromise;
        } catch (err) {
            console.error("Failed to initialize diagram engines:", err);
        } finally {
            clearInterval(this._progressInterval);

            // Fast forward progress to 100%
            this.progress = 100;

            // Wait for the width transition to complete before initiating the opacity fade-out
            setTimeout(() => {
                this.isLoading = false;
            }, 300);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('resize', this._onWindowResize);
    }

    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;

        // Bind window-level handlers so drag doesn't drop when cursor leaves splitter
        this._onDragMove = this.onDragMove.bind(this);
        this._onDragEnd = this.onDragEnd.bind(this);

        window.addEventListener('mousemove', this._onDragMove);
        window.addEventListener('mouseup', this._onDragEnd);
        window.addEventListener('touchmove', this._onDragMove, { passive: false });
        window.addEventListener('touchend', this._onDragEnd);
    }

    onDragMove(e) {
        if (!this.isDragging) return;

        e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const mainEl = this.shadowRoot.querySelector('.app-main');
        if (!mainEl) return;

        const rect = mainEl.getBoundingClientRect();

        let percentage;
        if (this.isDesktop) {
            percentage = ((clientX - rect.left) / rect.width) * 100;
        } else {
            // column-reverse layout: editor is at the bottom, preview is at the top
            percentage = ((rect.bottom - clientY) / rect.height) * 100;
        }

        // Constrain resize range between 15% and 85%
        this.splitPercentage = Math.max(15, Math.min(85, percentage));
    }

    onDragEnd() {
        this.isDragging = false;

        window.removeEventListener('mousemove', this._onDragMove);
        window.removeEventListener('mouseup', this._onDragEnd);
        window.removeEventListener('touchmove', this._onDragMove);
        window.removeEventListener('touchend', this._onDragEnd);

        // Dispatch window resize event so that layout can recalculate
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 50);
    }

    _loadFromUrl() {
        let encoded = null;
        if (window.location.hash.startsWith('#chart/')) {
            encoded = window.location.hash.substring(7);
        } else if (window.location.hash.startsWith('#uml/')) {
            encoded = window.location.hash.substring(5);
        } else {
            const params = new URLSearchParams(window.location.search);
            encoded = params.get('chart') || params.get('uml');
        }

        if (encoded && LZString) {
            try {
                const decoded = LZString.decompressFromEncodedURIComponent(encoded);
                if (decoded) return decoded;
            } catch (e) {
                console.error("Failed to parse from URL", e);
            }
        }
        return null;
    }

    _getDefaultUML() {
        return `@startuml
title Welcome to Chartre

actor User
participant Editor as "Chartre UI"
participant Renderer as "Client-side Engine"

User -> Editor: Type code (PlantUML or Mermaid)
Editor -> Renderer: Send code lines
Renderer -> Renderer: Compile diagram client-side
Renderer --> Editor: SVG output
Editor --> User: Show interactive diagram

note over Renderer: Runs completely in your browser!\\nNo server requests.
@enduml`;
    }

    _loadFromStorage() {
        return localStorage.getItem('chartreCode') || localStorage.getItem('plantumlCode');
    }

    handleUMLChanged(e) {
        this.umlCode = e.detail;
        localStorage.setItem('chartreCode', this.umlCode);

        if (LZString) {
            const compressed = LZString.compressToEncodedURIComponent(this.umlCode);
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '#chart/' + compressed;
            window.history.replaceState({ path: newUrl }, '', newUrl);
        }
        this.requestUpdate();
    }

    handleStatusChanged(e) {
        this.status = e.detail.status;
        this.isError = e.detail.isError;
    }

    handleShowConfirm(e) {
        const { title, message, confirmText, cancelText, onConfirm, isAlert, variant } = e.detail;
        this.confirmTitle = title || (isAlert ? 'Notice' : 'Confirm');
        this.confirmMessage = message || '';
        this.confirmText = confirmText || (isAlert ? 'OK' : 'Confirm');
        this.confirmCancelText = isAlert ? '' : (cancelText || 'Cancel');
        this.confirmVariant = variant || (isAlert ? 'primary' : 'danger');
        this._onConfirmCallback = onConfirm;
        this.isConfirmOpen = true;
    }

    handleConfirmDialogConfirm() {
        if (this._onConfirmCallback) {
            this._onConfirmCallback();
        }
        this.isConfirmOpen = false;
    }

    handleConfirmDialogCancel() {
        this.isConfirmOpen = false;
    }

    render() {
        const statusClass = this.isError
            ? 'error'
            : (this.status === 'Compiling...' ? 'compiling' : 'ready');

        return html`
            <div class="app-container ${this.isDesktop ? 'layout-desktop' : 'layout-mobile'}" @show-confirm="${this.handleShowConfirm}">
                <header-component
                    .umlCode="${this.umlCode}"
                    @uml-changed="${this.handleUMLChanged.bind(this)}"
                ></header-component>

                <main class="app-main">
                    <div class="editor-area" style="${this.isDesktop ? `width: calc(${this.splitPercentage}% - 2px); flex: none;` : `height: calc(${this.splitPercentage}% - 2px); flex: none;`}">
                        <editor-component
                            .umlCode="${this.umlCode}"
                            @uml-changed="${this.handleUMLChanged.bind(this)}"
                        ></editor-component>
                    </div>
                    
                    <div class="app-splitter ${this.isDragging ? 'dragging' : ''}" 
                         @mousedown="${this.startDrag}" 
                         @touchstart="${this.startDrag}"></div>
                    
                    <div class="preview-area" style="${this.isDesktop ? `width: calc(${100 - this.splitPercentage}% - 2px); flex: none;` : `height: calc(${100 - this.splitPercentage}% - 2px); flex: none;`}">
                        <preview-component
                            .umlCode="${this.umlCode}"
                            ?desktop="${this.isDesktop}"
                            @status-changed="${this.handleStatusChanged.bind(this)}"
                        ></preview-component>
                    </div>
                </main>

                <footer class="app-statusbar">
                    <span class="status-indicator ${statusClass}"></span>
                    <span class="status-text">${this.status}</span>
                </footer>

                <sl-dialog 
                    label="${this.confirmTitle || 'Confirm'}" 
                    ?open="${this.isConfirmOpen}"
                    @sl-request-close="${this.handleConfirmDialogCancel}"
                >
                    <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
                        <span style="font-size: 1.5rem; line-height: 1;">⚠️</span>
                        <div>
                            ${this.confirmMessage}
                        </div>
                    </div>
                    <sl-button slot="footer" variant="${this.confirmVariant || 'primary'}" @click="${this.handleConfirmDialogConfirm}">${this.confirmText || 'Confirm'}</sl-button>
                    ${this.confirmCancelText ? html`
                        <sl-button slot="footer" variant="neutral" @click="${this.handleConfirmDialogCancel}">${this.confirmCancelText}</sl-button>
                    ` : ''}
                </sl-dialog>
            </div>
            <app-loader class="${this.isLoading ? '' : 'fade-out'}" .progress="${this.progress}"></app-loader>
        `;
    }
}
