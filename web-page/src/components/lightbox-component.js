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
        scale: { type: Number, state: true },
        translateX: { type: Number, state: true },
        translateY: { type: Number, state: true }
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
            width: 100vw;
            height: 100vh;
            box-sizing: border-box;
            overflow: hidden; /* use custom drag pan */
            cursor: grab;
            background: var(--bg-primary, #f8fafc);
            color: var(--text-primary, #0f172a);
            user-select: none;
            touch-action: none;
        }

        .svg-wrapper:active {
            cursor: grabbing;
        }

        .svg-content-holder {
            position: absolute;
            left: 0;
            top: 0;
            transform-origin: 0 0;
            will-change: transform;
            pointer-events: none; /* events go to wrapper */
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: visible;
        }

        /* Style the injected SVG clone */
        .svg-content-holder svg {
            width: 100%;
            height: 100%;
            display: block;
        }

        /* ── Close button ──────────────────────────────────────────────── */
        .close-btn {
            position: fixed;
            top: 20px;
            left: 24px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
            background: var(--midi-btn-bg, rgba(0, 0, 0, 0.05));
            color: var(--text-primary, #1e293b);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
            z-index: 100;
        }

        .close-btn:hover {
            background: var(--bg-glass-active, rgba(0, 0, 0, 0.1));
            border-color: var(--border-hover, rgba(0, 0, 0, 0.2));
            transform: scale(1.1);
        }

        .close-btn:active {
            transform: scale(0.92);
        }

        /* ── Floating Zoom controls ────────────────────────────────────── */
        .zoom-toolbar {
            position: fixed;
            bottom: 24px;
            right: 24px;
            display: flex;
            align-items: center;
            gap: 8px;
            background: var(--bg-toolbar, rgba(255, 255, 255, 0.85));
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            padding: 6px 12px;
            border-radius: 99px;
            box-shadow: 
                0 10px 30px rgba(0, 0, 0, 0.08), 
                0 0 0 1px var(--border-color, rgba(0, 0, 0, 0.05));
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
            color: var(--text-primary, #1e293b);
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .zoom-btn:hover {
            background: var(--bg-glass-active, rgba(0, 0, 0, 0.05));
        }

        .zoom-btn:active {
            transform: scale(0.9);
        }

        .zoom-btn.reset {
            font-size: 0.95rem;
        }

        .zoom-text {
            font-family: var(--font-ui, 'Plus Jakarta Sans', sans-serif);
            font-size: 0.82rem;
            font-weight: 600;
            color: var(--text-primary, #1e293b);
            min-width: 44px;
            text-align: center;
            user-select: none;
        }

        /* ── Hint footer ───────────────────────────────────────────────── */
        .hint {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            font-family: var(--font-ui, 'Plus Jakarta Sans', sans-serif);
            font-size: 0.72rem;
            letter-spacing: 0.04em;
            color: var(--text-secondary, rgba(30, 41, 59, 0.6));
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
        this.scale = 1.0;
        this.translateX = 0;
        this.translateY = 0;

        // Pan state
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.panX = 0;
        this.panY = 0;
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

        // Reset transform states
        this.scale = 1.0;
        this.translateX = 0;
        this.translateY = 0;

        // Wait a frame for SVG rendering and styling to be computed correctly
        requestAnimationFrame(() => {
            this.fitToScreen();
        });
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

    applyTransform(smooth = false) {
        const canvas = this.shadowRoot.querySelector('.svg-content-holder');
        if (!canvas) return;

        if (smooth) {
            canvas.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => {
                if (canvas.style.transition && canvas.style.transition.includes('transform')) {
                    canvas.style.transition = 'none';
                }
            }, 200);
        } else {
            canvas.style.transition = 'none';
        }

        canvas.style.transform = `translate3d(${this.translateX}px, ${this.translateY}px, 0) scale(${this.scale})`;
    }

    fitToScreen() {
        const viewport = this.shadowRoot.querySelector('.svg-wrapper');
        const canvas = this.shadowRoot.querySelector('.svg-content-holder');
        if (!viewport || !canvas) return;

        const svg = canvas.querySelector('svg');
        if (!svg) return;

        // Reset styles temporarily to read native size
        canvas.style.width = '';
        canvas.style.height = '';
        svg.style.width = '';
        svg.style.height = '';

        const viewBoxAttr = svg.getAttribute('viewBox');
        let svgWidth = 0;
        let svgHeight = 0;

        if (viewBoxAttr) {
            const [, , w, h] = viewBoxAttr.split(' ').map(Number);
            svgWidth = w;
            svgHeight = h;
        } else {
            const rect = svg.getBoundingClientRect();
            svgWidth = rect.width || svg.clientWidth || 800;
            svgHeight = rect.height || svg.clientHeight || 600;
        }

        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;

        if (viewportWidth === 0 || viewportHeight === 0) return;

        // Standardize canvas dimensions to match the SVG size
        canvas.style.width = `${svgWidth}px`;
        canvas.style.height = `${svgHeight}px`;
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.maxWidth = 'none';
        svg.style.maxHeight = 'none';
        svg.style.display = 'block';

        // Scale to fit with 10% padding
        const scaleX = (viewportWidth * 0.9) / svgWidth;
        const scaleY = (viewportHeight * 0.9) / svgHeight;
        const fitScale = Math.min(scaleX, scaleY, 5.0); // Allow larger scaling in lightbox

        this.scale = fitScale;
        this.translateX = (viewportWidth - svgWidth * fitScale) / 2;
        this.translateY = (viewportHeight - svgHeight * fitScale) / 2;

        this.applyTransform(true);
    }

    resetZoom() {
        const viewport = this.shadowRoot.querySelector('.svg-wrapper');
        const canvas = this.shadowRoot.querySelector('.svg-content-holder');
        if (!viewport || !canvas) return;

        const svg = canvas.querySelector('svg');
        if (!svg) return;

        const viewBoxAttr = svg.getAttribute('viewBox');
        let svgWidth = 0;
        let svgHeight = 0;

        if (viewBoxAttr) {
            const [, , w, h] = viewBoxAttr.split(' ').map(Number);
            svgWidth = w;
            svgHeight = h;
        } else {
            const rect = svg.getBoundingClientRect();
            svgWidth = rect.width || svg.clientWidth || 800;
            svgHeight = rect.height || svg.clientHeight || 600;
        }

        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;

        this.scale = 1.0;
        this.translateX = (viewportWidth - svgWidth) / 2;
        this.translateY = (viewportHeight - svgHeight) / 2;

        this.applyTransform(true);
    }

    zoomIn() {
        this.zoomBy(1.15);
    }

    zoomOut() {
        this.zoomBy(1 / 1.15);
    }

    zoomBy(factor) {
        const viewport = this.shadowRoot.querySelector('.svg-wrapper');
        if (!viewport) return;

        const oldScale = this.scale;
        let newScale = this.scale * factor;
        newScale = Math.max(0.1, Math.min(10, newScale));

        const mouseX = viewport.clientWidth / 2;
        const mouseY = viewport.clientHeight / 2;

        this.translateX = mouseX - (mouseX - this.translateX) * (newScale / oldScale);
        this.translateY = mouseY - (mouseY - this.translateY) * (newScale / oldScale);
        this.scale = newScale;

        this.applyTransform(true);
    }

    // Pointer interaction events (Pan)
    onPointerDown(e) {
        if (e.button !== 0) return; // Only drag with left mouse button
        if (e.target.closest('.zoom-toolbar') || e.target.closest('.close-btn')) return;

        this.isDragging = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.panX = this.translateX;
        this.panY = this.translateY;

        const viewport = this.shadowRoot.querySelector('.svg-wrapper');
        if (viewport) {
            viewport.setPointerCapture(e.pointerId);
        }
    }

    onPointerMove(e) {
        if (!this.isDragging) return;

        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;

        this.translateX = this.panX + dx;
        this.translateY = this.panY + dy;
        this.applyTransform(false);
    }

    onPointerUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;

        const viewport = this.shadowRoot.querySelector('.svg-wrapper');
        if (viewport) {
            viewport.releasePointerCapture(e.pointerId);
        }
    }

    onWheel(e) {
        e.preventDefault();

        if (e.ctrlKey) {
            // Zoom behaviour: Handle trackpad pinch gestures smoothly or standard ctrl + wheel zoom
            let zoomFactor = 1.08;
            if (Math.abs(e.deltaY) < 10) {
                zoomFactor = 1 + (Math.abs(e.deltaY) * 0.03); // Smoother trackpad pinch
            }

            const direction = e.deltaY < 0 ? 1 : -1;
            const oldScale = this.scale;
            let newScale = direction > 0 ? this.scale * zoomFactor : this.scale / zoomFactor;

            newScale = Math.max(0.1, Math.min(10, newScale));

            const viewport = this.shadowRoot.querySelector('.svg-wrapper');
            if (!viewport) return;

            const rect = viewport.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            this.translateX = mouseX - (mouseX - this.translateX) * (newScale / oldScale);
            this.translateY = mouseY - (mouseY - this.translateY) * (newScale / oldScale);
            this.scale = newScale;

            this.applyTransform(false);
            this.requestUpdate();
        } else {
            // Pan behaviour: standard wheel scroll moves the canvas vertically and horizontally
            this.translateX -= e.deltaX;
            this.translateY -= e.deltaY;
            this.applyTransform(false);
        }
    }

    onDoubleClick(e) {
        if (e.target.closest('.zoom-toolbar') || e.target.closest('.close-btn')) return;
        this.fitToScreen();
    }

    // Touch support (Multi-touch pinch zoom)
    handleTouchStart(e) {
        if (e.touches.length === 2) {
            this.isDragging = false;
            this.startDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            this.startScale = this.scale;
        }
    }

    handleTouchMove(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            if (dist > 10 && this.startDist > 0) {
                const factor = dist / this.startDist;
                const oldScale = this.scale;
                let newScale = Math.max(0.1, Math.min(10, this.startScale * factor));

                const viewport = this.shadowRoot.querySelector('.svg-wrapper');
                if (!viewport) return;
                const rect = viewport.getBoundingClientRect();
                const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
                const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

                this.translateX = midX - (midX - this.translateX) * (newScale / oldScale);
                this.translateY = midY - (midY - this.translateY) * (newScale / oldScale);
                this.scale = newScale;

                this.applyTransform(false);
                this.requestUpdate();
            }
        }
    }

    render() {
        const zoomPct = Math.round(this.scale * 100);

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
                    class="svg-wrapper"
                    @pointerdown=${this.onPointerDown}
                    @pointermove=${this.onPointerMove}
                    @pointerup=${this.onPointerUp}
                    @pointercancel=${this.onPointerUp}
                    @wheel=${this.onWheel}
                    @dblclick=${this.onDoubleClick}
                    @touchstart=${this.handleTouchStart}
                    @touchmove=${this.handleTouchMove}
                >
                    <div class="svg-content-holder">
                        <!-- SVG injected here by updated() -->
                    </div>
                </div>

                <div class="hint">Drag to pan • Pinch or Scroll to zoom • Press Esc to close</div>

                <div class="zoom-toolbar">
                    <button class="zoom-btn" @click="${this.zoomOut}" title="Zoom Out">-</button>
                    <span class="zoom-text">${zoomPct}%</span>
                    <button class="zoom-btn" @click="${this.zoomIn}" title="Zoom In">+</button>
                    <button class="zoom-btn reset" @click="${this.resetZoom}" title="Actual Size (1:1)">1:1</button>
                    <button class="zoom-btn reset" @click="${this.fitToScreen}" title="Fit to Screen" style="display: flex; align-items: center; justify-content: center;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: block;">
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <polyline points="9 21 3 21 3 15"></polyline>
                            <line x1="21" y1="3" x2="14" y2="10"></line>
                            <line x1="3" y1="21" x2="10" y2="14"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }
}
