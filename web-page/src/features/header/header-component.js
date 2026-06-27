import { LitElement, html, css } from 'lit';
import { HeaderController } from './header-controller.js';

export class HeaderComponent extends LitElement {
    static properties = {
        umlCode: { type: String }
    };

    // Instantiate and bind the dedicated business controller
    ctrl = new HeaderController(this);

    static styles = css`
        :host {
            display: block;
            width: 100%;
        }

        .header-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 48px;
            padding: 0 20px;
            background: var(--bg-glass);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border-color);
            box-sizing: border-box;
            position: relative;
            z-index: 10;
        }

        .logo-area {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .logo-img {
            width: 24px;
            height: 24px;
            object-fit: contain;
            animation: pulse-glow-logo 2s infinite ease-in-out;
        }

        .logo-title {
            font-size: 1.15rem;
            font-weight: 700;
            background: linear-gradient(135deg, #a78bfa 0%, #6366f1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.02em;
        }

        .logo-subtitle {
            font-size: 0.75rem;
            color: var(--text-muted);
            font-weight: 500;
            border-left: 1px solid var(--border-color);
            padding-left: 10px;
            margin-left: 2px;
            display: inline-block;
        }

        .controls-wrapper {
            display: flex;
            align-items: center;
        }

        .header-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            font-size: 0.95rem;
            color: var(--text-secondary);
            background: var(--midi-btn-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            margin-left: 6px;
            cursor: pointer;
            transition: all var(--transition-fast);
            outline: none;
            padding: 0;
            flex-shrink: 0;
        }

        .header-btn svg {
            width: 16px;
            height: 16px;
        }

        .header-btn:hover {
            background: var(--bg-glass-active);
            border-color: var(--accent-violet);
            color: var(--text-primary);
            transform: scale(1.05);
        }

        .header-btn:active {
            transform: scale(0.95);
        }

        @keyframes pulse-glow-logo {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(167, 139, 250, 0.2)); }
            50% { transform: scale(1.08); filter: drop-shadow(0 0 8px rgba(167, 139, 250, 0.6)); }
        }

        @media (max-width: 768px) {
            .header-container {
                padding: 0 8px;
                height: 44px;
            }

            .logo-subtitle {
                display: none;
            }

            .logo-area {
                gap: 6px;
            }

            .logo-icon {
                font-size: 1.1rem;
            }

            .logo-title {
                font-size: 0.95rem;
            }

            .header-btn {
                width: 30px;
                height: 30px;
                font-size: 0.85rem;
                margin-left: 4px;
                border-radius: 5px;
            }

            .header-btn svg {
                width: 14px !important;
                height: 14px !important;
            }
        }
    `;

    render() {
        return html`
            <div class="header-container">
                <div class="logo-area">
                    <img class="logo-img" src="./favicon.svg" alt="Chartre Logo" />
                    <span class="logo-title">Chartre</span>
                    <span class="logo-subtitle">Diagram Workspace</span>
                </div>

                <div class="controls-wrapper">
                    <button class="header-btn" @click="${() => this.ctrl.handleShare(this.umlCode)}" title="Copy shareable link to clipboard">
                        ${this.ctrl.shareSuccess ? '✅' : '🔗'}
                    </button>

                    <button class="header-btn" @click="${() => this.ctrl.toggleFullscreen()}" title="Toggle fullscreen mode">
                        ${this.ctrl.isFullscreen
                            ? html`
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                  <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" stroke-linecap="round" stroke-linejoin="round"/>
                              </svg>`
                            : html`
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                  <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" stroke-linecap="round" stroke-linejoin="round"/>
                              </svg>`
                        }
                    </button>

                    <button class="header-btn" @click="${() => this.ctrl.toggleTheme()}" title="Toggle between light and dark themes">
                        ${this.ctrl.currentTheme === 'light' ? '🌙' : '☀️'}
                    </button>
                </div>
            </div>
        `;
    }
}
customElements.define('header-component', HeaderComponent);