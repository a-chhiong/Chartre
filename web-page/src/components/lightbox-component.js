import { LitElement, html, css } from 'lit';

/**
 * <lightbox-modal> — A self-contained fullscreen SVG lightbox with Zoom & Pan features.
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
        zoom: { type: Number, state: true },
        panX: { type: Number, state: true },
        panY: { type: Number, state: true },
        isDragging: { type: Boolean, state: true }
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
            width: 100%;
            height: 100%;
            box-sizing: border-box;
            overflow: hidden; /* use custom drag pan */
            cursor: grab;
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
            user-select: none;
        }

        .svg-wrapper.dragging {
            cursor: grabbing;
        }

        .svg-content-holder {
            display: flex;
            align-items: center;
            justify-content: center;
            transform-origin: center center;
            will-change: transform;
            pointer-events: none; /* events go to wrapper */
            width: 100%;
            height: 100%;
        }

        /* Style the injected SVG clone */
        .svg-content-holder svg {
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

        /* ── Floating Zoom controls ────────────────────────────────────── */
        .zoom-toolbar {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            padding: 6px 12px;
            border-radius: 99px;
            box-shadow: 
                0 10px 30px rgba(0, 0, 0, 0.08), 
                0 0 0 1px rgba(0, 0, 0, 0.05);
            z-index: 100;
        }

        .zoom-btn {
            background: transparent;
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1e293b;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .zoom-btn:hover {
            background: rgba(0, 0, 0, 0.05);
        }

        .zoom-btn:active {
            transform: scale(0.9);
        }

        .zoom-btn.reset {
            font-size: 0.95rem;
        }

        .zoom-text {
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            font-size: 0.82rem;
            font-weight: 600;
            color: #1e293b;
            min-width: 44px;
            text-align: center;
            user-select: none;
        }

        /* ── Hint footer ───────────────────────────────────────────────── */
        .hint {
            position: fixed;
            bottom: 68px;
            left: 50%;
            transform: translateX(-50%);
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            font-size: 0.7rem;
            letter-spacing: 0.04em;
            color: rgba(30, 41, 59, 0.6);
            pointer-events: none;
            white-space: nowrap;
            user-select: none;
            z-index: 100;
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
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        
        // Touch pinch-to-zoom tracking
        this.startDist = 0;
        this.startZoom = 1.0;
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
        const wrapper = this.shadowRoot?.querySelector('.svg-content-holder');
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

    // Drag-to-pan handlers
    handleMouseDown(e) {
        if (e.button !== 0) return; // Left click only
        e.preventDefault();
        this.isDragging = true;
        this.startX = e.clientX - this.panX;
        this.startY = e.clientY - this.panY;

        this._onMouseMove = this.handleMouseMove.bind(this);
        this._onMouseUp = this.handleMouseUp.bind(this);
        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('mouseup', this._onMouseUp);
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;
        this.panX = e.clientX - this.startX;
        this.panY = e.clientY - this.startY;
    }

    handleMouseUp() {
        this.isDragging = false;
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('mouseup', this._onMouseUp);
    }

    // Mouse wheel zoom
    handleWheel(e) {
        e.preventDefault();
        const zoomFactor = 1.1;
        let newZoom;
        if (e.deltaY < 0) {
            newZoom = this.zoom * zoomFactor;
        } else {
            newZoom = this.zoom / zoomFactor;
        }
        this.zoom = Math.max(0.4, Math.min(5.0, newZoom));
    }

    // Touch support (Drag to pan & pinch-to-zoom)
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            this.isDragging = true;
            this.startX = e.touches[0].clientX - this.panX;
            this.startY = e.touches[0].clientY - this.panY;
        } else if (e.touches.length === 2) {
            this.isDragging = false;
            this.startDist = this._getTouchDist(e);
            this.startZoom = this.zoom;
        }
    }

    handleTouchMove(e) {
        if (this.isDragging && e.touches.length === 1) {
            e.preventDefault();
            this.panX = e.touches[0].clientX - this.startX;
            this.panY = e.touches[0].clientY - this.startY;
        } else if (e.touches.length === 2) {
            e.preventDefault();
            const dist = this._getTouchDist(e);
            if (dist > 10 && this.startDist > 0) {
                const scale = dist / this.startDist;
                this.zoom = Math.max(0.4, Math.min(5.0, this.startZoom * scale));
            }
        }
    }

    handleTouchEnd() {
        this.isDragging = false;
    }

    _getTouchDist(e) {
        return Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    }

    // Zoom controls
    zoomIn() {
        this.zoom = Math.min(5.0, parseFloat((this.zoom + 0.2).toFixed(1)));
    }

    zoomOut() {
        this.zoom = Math.max(0.4, parseFloat((this.zoom - 0.2).toFixed(1)));
    }

    resetZoom() {
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
    }

    render() {
        const transitionDuration = this.isDragging ? '0s' : '0.15s';
        const transformStyle = `transform: translate(${this.panX}px, ${this.panY}px) scale(${this.zoom}); transition: transform ${transitionDuration} cubic-bezier(0.25, 0.46, 0.45, 0.94);`;

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

                <div 
                    class="svg-wrapper ${this.isDragging ? 'dragging' : ''}"
                    @mousedown="${this.handleMouseDown}"
                    @touchstart="${this.handleTouchStart}"
                    @touchmove="${this.handleTouchMove}"
                    @touchend="${this.handleTouchEnd}"
                    @wheel="${this.handleWheel}"
                >
                    <div class="svg-content-holder" style="${transformStyle}">
                        <!-- SVG injected here by updated() -->
                    </div>
                </div>

                <div class="hint">Drag to pan • Pinch or Scroll to zoom • Press Esc to close</div>

                <div class="zoom-toolbar">
                    <button class="zoom-btn" @click="${this.zoomOut}" title="Zoom Out">-</button>
                    <span class="zoom-text">${Math.round(this.zoom * 100)}%</span>
                    <button class="zoom-btn" @click="${this.zoomIn}" title="Zoom In">+</button>
                    <button class="zoom-btn reset" @click="${this.resetZoom}" title="Reset Zoom">↺</button>
                </div>
            </div>
        `;
    }
}
