import { LitElement, html, css } from 'lit';
import { AppController } from '../controllers/app-controller.js';

export class AppComponent extends LitElement {
    // Instantiate our business logic controller cleanly
    ctrl = new AppController(this);

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

    handleUMLChanged(e) {
        this.ctrl.updateUMLCode(e.detail);
    }

    handleStatusChanged(e) {
        this.ctrl.status = e.detail.status;
        this.ctrl.isError = e.detail.isError;
        this.requestUpdate();
    }

    handleShowConfirm(e) {
        this.ctrl.showConfirm(e.detail);
    }

    render() {
        const c = this.ctrl;
        const statusClass = c.isError
            ? 'error'
            : (c.status === 'Compiling...' ? 'compiling' : 'ready');

        return html`
            <div class="app-container ${c.isDesktop ? 'layout-desktop' : 'layout-mobile'}" @show-confirm="${this.handleShowConfirm}">
                <header-component
                    .umlCode="${c.umlCode}"
                    @uml-changed="${this.handleUMLChanged}"
                ></header-component>

                <main class="app-main">
                    <div class="editor-area" style="${c.isDesktop ? `width: calc(${c.splitPercentage}% - 2px); flex: none;` : `height: calc(${c.splitPercentage}% - 2px); flex: none;`}">
                        <editor-component
                            .umlCode="${c.umlCode}"
                            @uml-changed="${this.handleUMLChanged}"
                        ></editor-component>
                    </div>
                    
                    <div class="app-splitter ${c.isDragging ? 'dragging' : ''}" 
                         @mousedown="${(e) => c.startDrag(e)}" 
                         @touchstart="${(e) => c.startDrag(e)}"></div>
                    
                    <div class="preview-area" style="${c.isDesktop ? `width: calc(${100 - c.splitPercentage}% - 2px); flex: none;` : `height: calc(${100 - c.splitPercentage}% - 2px); flex: none;`}">
                        <preview-component
                            .umlCode="${c.umlCode}"
                            ?desktop="${c.isDesktop}"
                            @status-changed="${this.handleStatusChanged}"
                        ></preview-component>
                    </div>
                </main>

                <footer class="app-statusbar">
                    <span class="status-indicator ${statusClass}"></span>
                    <span class="status-text">${c.status}</span>
                </footer>

                <sl-dialog 
                    label="${c.confirmTitle || 'Confirm'}" 
                    ?open="${c.isConfirmOpen}"
                    @sl-request-close="${() => c.handleCancel()}"
                >
                    <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
                        <span style="font-size: 1.5rem; line-height: 1;">⚠️</span>
                        <div>
                            ${c.confirmMessage}
                        </div>
                    </div>
                    <sl-button slot="footer" variant="${c.confirmVariant || 'primary'}" @click="${() => c.handleConfirm()}">${c.confirmText || 'Confirm'}</sl-button>
                    ${c.confirmCancelText ? html`
                        <sl-button slot="footer" variant="neutral" @click="${() => c.handleCancel()}">${c.confirmCancelText}</sl-button>
                    ` : ''}
                </sl-dialog>
            </div>
            <app-loader class="${c.isLoading ? '' : 'fade-out'}" .progress="${c.progress}"></app-loader>
        `;
    }
}