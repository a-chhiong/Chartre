import { LitElement, html, css } from 'lit';

/**
 * <lightbox-modal> — A self-contained fullscreen SVG lightbox.
 *
 * Usage:
 *   const modal = document.createElement('lightbox-modal');
 *   modal.svgNode = svgElement; // pass the live SVG node; it will be deep-cloned
 *   document.body.appendChild(modal);
 *
 * The component self-removes from the DOM when closed (Esc, backdrop click, or ✕).
 */
export class LightboxComponent extends LitElement {
    static properties = {
        svgNode: { type: Object },
        _closing: { type: Boolean, state: true },
    };

    static styles = css`
        :host {
            /* Take no layout space; the overlay covers everything via position:fixed */
            display: block;
            position: fixed;
            inset: 0;
            z-index: 99999;
            pointer-events: none; /* let overlay handle clicks */
        }

        /* ── Backdrop ──────────────────────────────────────────────────── */
        .overlay {
            position: fixed;
            inset: 0;
            background: rgba(245, 247, 250, 0.82);
            backdrop-filter: blur(22px);
            -webkit-backdrop-filter: blur(22px);
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: all;
            animation: lb-open 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .overlay.closing {
            animation: lb-close 0.15s ease forwards;
            pointer-events: none;
        }

        /* ── SVG container ─────────────────────────────────────────────── */
        .svg-wrapper {
            position: relative;
            max-width: 92vw;
            max-height: 90vh;
            box-sizing: border-box;
            overflow: auto;
            cursor: default;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            color: #1e293b; /* Enforce dark stroke/text color for currentColor SVGs */
            padding: 24px;
            /* Subtle paper shadow so the SVG "floats" */
            border-radius: 12px;
            box-shadow:
                0 20px 50px rgba(0, 0, 0, 0.12),
                0 0 0 1px rgba(0, 0, 0, 0.05);
        }

        /* Style the injected SVG clone */
        .svg-wrapper svg {
            max-width: 100%;
            max-height: 100%;
            display: block;
        }

        /* ── Close button ──────────────────────────────────────────────── */
        .close-btn {
            position: fixed;
            top: 20px;
            right: 24px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 1px solid rgba(0, 0, 0, 0.1);
            background: rgba(0, 0, 0, 0.05);
            color: #1e293b;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
            z-index: 100;
        }

        .close-btn:hover {
            background: rgba(0, 0, 0, 0.1);
            border-color: rgba(0, 0, 0, 0.2);
            transform: scale(1.1);
        }

        .close-btn:active {
            transform: scale(0.92);
        }

        /* ── Hint footer ───────────────────────────────────────────────── */
        .hint {
            position: fixed;
            bottom: 18px;
            left: 50%;
            transform: translateX(-50%);
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            font-size: 0.7rem;
            letter-spacing: 0.04em;
            color: rgba(30, 41, 59, 0.6);
            pointer-events: none;
            white-space: nowrap;
            user-select: none;
        }

        /* ── Animations ────────────────────────────────────────────────── */
        @keyframes lb-open {
            from { opacity: 0; transform: scale(0.96); }
            to   { opacity: 1; transform: scale(1); }
        }

        @keyframes lb-close {
            from { opacity: 1; transform: scale(1); }
            to   { opacity: 0; transform: scale(0.97); }
        }
    `;

    constructor() {
        super();
        this._closing = false;
    }

    connectedCallback() {
        super.connectedCallback();
        this._onKeyDown = (e) => {
            if (e.key === 'Escape') this._close();
        };
        window.addEventListener('keydown', this._onKeyDown);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('keydown', this._onKeyDown);
    }

    /** Inject the cloned SVG node into the wrapper container after render. */
    updated(changedProperties) {
        if (changedProperties.has('svgNode') && this.svgNode) {
            this._injectSvg();
        }
    }

    _injectSvg() {
        const wrapper = this.shadowRoot?.querySelector('.svg-wrapper');
        if (!wrapper) return;
        wrapper.innerHTML = '';
        const clone = this.svgNode.cloneNode(true);
        
        // Clear style attribute to remove any theme-based background colors/positions
        clone.removeAttribute('style');

        // Check if viewBox exists
        let viewBox = clone.getAttribute('viewBox');
        if (!viewBox) {
            // Try to create viewBox from width and height attributes
            const w = this.svgNode.getAttribute('width') || clone.getAttribute('width');
            const h = this.svgNode.getAttribute('height') || clone.getAttribute('height');
            if (w && h) {
                const wVal = w.replace('px', '').trim();
                const hVal = h.replace('px', '').trim();
                if (!isNaN(parseFloat(wVal)) && !isNaN(parseFloat(hVal))) {
                    viewBox = `0 0 ${wVal} ${hVal}`;
                    clone.setAttribute('viewBox', viewBox);
                }
            }
        }

        // If viewBox exists, enforce intrinsic width and height attributes
        if (viewBox) {
            const parts = viewBox.trim().split(/\s+/);
            if (parts.length === 4) {
                const wVal = parseFloat(parts[2]);
                const hVal = parseFloat(parts[3]);
                if (!isNaN(wVal) && !isNaN(hVal)) {
                    clone.setAttribute('width', wVal);
                    clone.setAttribute('height', hVal);
                }
            }
        }
        wrapper.appendChild(clone);
    }

    _close() {
        if (this._closing) return;
        this._closing = true;

        const overlay = this.shadowRoot?.querySelector('.overlay');
        if (overlay) {
            overlay.classList.add('closing');
            overlay.addEventListener('animationend', () => this.remove(), { once: true });
        } else {
            this.remove();
        }
    }

    render() {
        return html`
            <div
                class="overlay"
                role="dialog"
                aria-modal="true"
                aria-label="Fullscreen diagram view"
            >
                <button
                    class="close-btn"
                    @click="${this._close}"
                    title="Close (Esc)"
                    aria-label="Close fullscreen view"
                >
                    <!-- X icon -->
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                         style="width:14px;height:14px;pointer-events:none">
                        <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>

                <!-- SVG injected here by updated() -->
                <div class="svg-wrapper"></div>

                <div class="hint">Press Esc or click the close button to close</div>
            </div>
        `;
    }
}
