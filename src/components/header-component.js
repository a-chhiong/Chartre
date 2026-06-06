import { LitElement, html, css } from 'lit';
import LZString from 'lz-string';

const PRESETS = {
    sequence: `@startuml Sequence
title Online Shopping Sequence

actor Customer
participant "Web Portal" as Portal
database "Inventory DB" as DB
participant "Payment Gateway" as Gateway

Customer -> Portal: Search for item
Portal -> DB: Query stock
DB --> Portal: Item available
Portal --> Customer: Display item & Buy button

Customer -> Portal: Click Buy Item
Portal -> Gateway: Authorize payment
Gateway --> Portal: Payment successful
Portal -> DB: Decrement stock count
Portal --> Customer: Show Order Confirmation page
@enduml`,

    class: `@startuml ClassDiagram
title System Class Diagram

interface Renderable {
  +render(): SVG
}

class Diagram {
  -sourceCode: String
  -format: String
  +getSVG(): SVG
}

class User {
  +name: String
  +email: String
  +createDiagram(code: String): Diagram
}

Renderable <|.. Diagram
User "1" *-- "many" Diagram : owns >
@enduml`,

    usecase: `@startuml UseCase
left to right direction
actor Customer
actor Admin

rectangle "Online Shop" {
  Customer --> (Browse Products)
  Customer --> (Checkout Order)
  Customer --> (View Order History)
  
  (Manage Inventory) <-- Admin
  (Add New Product) <-- Admin
}
@enduml`,

    activity: `@startuml Activity
title Document Approval Process

start
:Submit Document;
if (Review Required?) then (yes)
  :Assign Reviewers;
  :Perform Review;
  if (Review Status) then (approved)
    :Approve Document;
  else (rejected)
    :Reject Document;
    :Notify Author;
    stop
  endif
else (no)
  :Approve Document;
endif
:Publish Document;
stop
@enduml`,

    state: `@startuml StateDiagram
title Order Fulfillment State

[*] --> Pending : Customer places order

state Pending {
  [*] --> PaymentAuth
  PaymentAuth --> AwaitingShipping : Payment approved
  PaymentAuth --> Cancelled : Insufficient funds
}

AwaitingShipping --> Shipped : Carrier picks up package
Shipped --> Delivered : Delivery confirmation
Delivered --> [*]
Cancelled --> [*]
@enduml`,

    component: `@startuml ComponentDiagram
title Microservice Architecture

package "Frontend Client" {
  [Single Page Application] as SPA
}

package "API Gateway Layer" {
  [Reverse Proxy / Gateway] as GW
}

database "Redis Cache" as Cache

package "Core Services" {
  [Auth Service] as Auth
  [Billing Service] as Billing
}

SPA --> GW : HTTP API requests
GW --> Auth : Authenticate request
GW --> Billing : Charge user
Billing ..> Cache : Read/Write session
@enduml`,

    mindmap: `@startmindmap
* PlantEditor Project
** Core Engine
*** Viz.js (Graphviz)
*** PlantUML compilation (TeaVM)
** UI Layer
*** Lit web components
*** Split Pane (Draggable)
*** Theme sync (Light/Dark)
** Features
*** Live updates
*** Shareable links
*** Image exports (SVG / PNG)
@endmindmap`
};

export class HeaderComponent extends LitElement {
    static properties = {
        umlCode: { type: String },
        isFullscreen: { type: Boolean },
        currentTheme: { type: String },
        shareSuccess: { type: Boolean },
        selectedPreset: { type: String },
        _fauxFullscreen: { type: Boolean, state: true }
    };

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

        .presets-select {
            background: var(--midi-btn-bg);
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            font-family: var(--font-ui);
            font-size: 0.82rem;
            font-weight: 600;
            height: 32px;
            padding: 0 12px;
            border-radius: 6px;
            cursor: pointer;
            transition: all var(--transition-fast);
            margin-left: 8px;
            outline: none;
            max-width: 140px;
            white-space: nowrap;
            box-sizing: border-box;
        }

        .presets-select:hover {
            background: var(--bg-glass-active);
            color: var(--text-primary);
            border-color: var(--accent-violet);
        }

        .presets-select option {
            background: var(--bg-toolbar);
            color: var(--text-primary);
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

            .presets-select {
                padding: 0 8px;
                font-size: 0.75rem;
                max-width: 100px;
                margin-left: 4px;
                height: 30px;
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

        @media (max-width: 480px) {
            .presets-select {
                padding: 0 6px;
                max-width: 85px;
            }
        }
    `;

    constructor() {
        super();
        this.isFullscreen = false;
        this._fauxFullscreen = false;
        this.shareSuccess = false;
        this.selectedPreset = '';
        this.currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    }

    willUpdate(changedProperties) {
        if (changedProperties.has('umlCode')) {
            const code = this.umlCode?.trim();
            let matchedPreset = '';
            if (code) {
                for (const [key, val] of Object.entries(PRESETS)) {
                    if (val.trim() === code) {
                        matchedPreset = key;
                        break;
                    }
                }
            }
            this.selectedPreset = matchedPreset;
        }
    }

    handlePresetChange(e) {
        const val = e.target.value;
        if (val && PRESETS[val]) {
            const currentCode = this.umlCode || '';
            if (!currentCode.trim() || confirm('⚠️ WARNING: Loading a template will overwrite your current diagram.\n\nAre you sure you want to proceed?')) {
                this.dispatchEvent(new CustomEvent('uml-changed', {
                    detail: PRESETS[val],
                    bubbles: true,
                    composed: true
                }));
            } else {
                e.target.value = this.selectedPreset || '';
            }
        }
    }

    connectedCallback() {
        super.connectedCallback();
        this._onFullscreenChange = () => {
            this.isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
        };
        document.addEventListener('fullscreenchange', this._onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', this._onFullscreenChange);
    }

    disconnectedCallback() {
        document.removeEventListener('fullscreenchange', this._onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', this._onFullscreenChange);
        super.disconnectedCallback();
    }

    toggleFullscreen() {
        const el = document.documentElement;
        const isInNativeFS = !!(document.fullscreenElement || document.webkitFullscreenElement);

        if (isInNativeFS) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
            return;
        }

        if (this._fauxFullscreen) {
            el.classList.remove('faux-fullscreen');
            this._fauxFullscreen = false;
            this.isFullscreen = false;
            return;
        }

        if (el.requestFullscreen) {
            el.requestFullscreen().catch((err) => {
                console.warn(`requestFullscreen failed: ${err.message}`);
            });
            return;
        }

        if (el.webkitRequestFullscreen) {
            try {
                el.webkitRequestFullscreen();
            } catch (err) {
                console.warn(`webkitRequestFullscreen failed: ${err.message}`);
            }
            return;
        }

        el.classList.add('faux-fullscreen');
        this._fauxFullscreen = true;
        this.isFullscreen = true;
    }

    async copyTextToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            if (!success) {
                throw new Error('execCommand copy failed');
            }
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('plantEditorTheme', newTheme);
        localStorage.setItem('staveEditorTheme', newTheme);
        this.currentTheme = newTheme;

        // Dispatch a global event so that dynamic assets (like diagrams) can render with correct theme options
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: newTheme } }));
    }

    async handleShare() {
        try {
            let shareUrl = window.location.href;
            if (LZString && this.umlCode) {
                const compressed = LZString.compressToEncodedURIComponent(this.umlCode);
                shareUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?uml=' + compressed;
                window.history.replaceState({ path: shareUrl }, '', shareUrl);
            }
            await this.copyTextToClipboard(shareUrl);
            this.shareSuccess = true;
            setTimeout(() => {
                this.shareSuccess = false;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy URL:', err);
        }
    }

    render() {
        return html`
            <div class="header-container">
                <div class="logo-area">
                    <img class="logo-img" src="./favicon.svg" alt="PlantUML Logo" />
                    <span class="logo-title">PlantEditor</span>
                    <span class="logo-subtitle">PlantUML Workspace</span>
                </div>
 
                <div class="controls-wrapper">
                    <select class="presets-select" .value="${this.selectedPreset || ''}" @change="${this.handlePresetChange}" title="Load diagram template">
                        <option value="" disabled>模板</option>
                        <option value="sequence">Sequence</option>
                        <option value="class">Class</option>
                        <option value="usecase">Use Case</option>
                        <option value="activity">Activity</option>
                        <option value="state">State</option>
                        <option value="component">Component</option>
                        <option value="mindmap">Mind-Map</option>
                    </select>

                    <button class="header-btn" @click="${this.handleShare}" title="Copy shareable link to clipboard">
                        ${this.shareSuccess ? '✅' : '🔗'}
                    </button>

                    <button class="header-btn" @click="${this.toggleFullscreen}" title="Toggle fullscreen mode">
                        ${this.isFullscreen
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
                    
                    <button class="header-btn" @click="${this.toggleTheme}" title="Toggle between light and dark themes">
                        ${this.currentTheme === 'light' ? '🌙' : '☀️'}
                    </button>
                </div>
            </div>
        `;
    }
}
