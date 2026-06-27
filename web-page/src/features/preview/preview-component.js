import { LitElement, html, css } from 'lit';
import { PreviewController } from './preview-controller';

export class PreviewComponent extends LitElement {
    static properties = {
        umlCode: { type: String },
        scale: { type: Number, state: true },
        translateX: { type: Number, state: true },
        translateY: { type: Number, state: true },
        desktop: { type: Boolean, reflect: true }
    };

    static styles = css`
        :host {
            container-type: inline-size;
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            flex: 1;
            min-height: 0;
            overflow: hidden;
        }

        .preview-container {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            overflow: hidden;
            background: var(--bg-glass);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
        }

        /* Preview Header Panel */
        .preview-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 40px;
            min-height: 40px;
            padding: 0 16px;
            background: var(--bg-panel-header);
            border-bottom: 1px solid var(--border-color);
            box-sizing: border-box;
            flex-shrink: 0;
            gap: 12px;
            position: relative;
            z-index: 20;
        }

        .header-title {
            flex: 1 1 0%;
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
            height: 28px;
        }

        .zoom-controls {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            gap: 4px;
            background: var(--bg-zoom-controls);
            padding: 0 6px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            height: 28px;
            box-sizing: border-box;
        }

        .zoom-btn {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-size: 0.75rem;
            cursor: pointer;
            width: 20px;
            height: 20px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all var(--transition-fast);
        }

        .zoom-btn:hover {
            background: var(--bg-glass-active);
            color: var(--text-primary);
        }

        .zoom-btn:active {
            transform: scale(0.9);
        }

        .zoom-btn:disabled {
            opacity: 0.35;
            cursor: not-allowed;
            background: transparent !important;
            transform: none !important;
        }

        .zoom-value {
            font-family: var(--font-code);
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--text-primary);
            min-width: 34px;
            text-align: center;
            user-select: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 20px;
        }

        /* Scrollable Canvas Viewport */
        .preview-canvas {
            position: relative;
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 0;
            cursor: grab;
            user-select: none;
            touch-action: none;
        }

        .preview-canvas:active {
            cursor: grabbing;
        }

        /* The Diagram Paper */
        .diagram-paper {
            background: var(--bg-paper);
            border-radius: 12px;
            box-shadow: var(--shadow-paper);
            padding: 20px;
            box-sizing: border-box;
            border: 1px solid rgba(0, 0, 0, 0.06);
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: visible;
            position: absolute;
            left: 0;
            top: 0;
            transform-origin: 0 0;
            will-change: transform;
        }

        .notation-display {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            background: transparent;
        }

        /* Force rendered SVG to be responsive and fit inside the paper card */
        .notation-display svg {
            max-width: 100%;
            height: auto !important;
            display: block;
        }

        .empty-state {
            color: var(--text-muted);
            font-size: 0.9rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 200px;
            gap: 12px;
            text-align: center;
        }

        .empty-icon {
            width: 48px;
            height: 48px;
            object-fit: contain;
            opacity: 0.4;
            animation: pulse-slow 3s infinite ease-in-out;
        }

        /* Fatal Error Panel */
        .error-panel {
            background: var(--warning-bg);
            border: 1px solid var(--warning-border);
            border-radius: 10px;
            padding: 12px 16px;
            margin-top: 12px;
            width: 75%;
            max-width: 800px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            flex-shrink: 0;
        }

        .error-header {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--accent-rose);
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .error-message {
            font-family: var(--font-code);
            font-size: 0.75rem;
            color: var(--warning-text);
            line-height: 1.4;
            padding: 8px;
            background: var(--warning-item-bg);
            border-radius: 4px;
            border-left: 3px solid var(--accent-rose);
            white-space: pre-wrap;
        }

        /* Action Controls Group */
        .header-controls {
            flex: 1 1 0%;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            height: 28px;
        }

        /* Action Buttons */
        .action-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--midi-btn-bg);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            font-family: var(--font-ui);
            font-size: 0.9rem;
            font-weight: 600;
            height: 28px;
            width: 28px;
            border-radius: 6px;
            cursor: pointer;
            transition: all var(--transition-fast);
            user-select: none;
            white-space: nowrap;
            box-sizing: border-box;
            flex-shrink: 0;
        }

        .action-btn:hover {
            background: var(--bg-glass-active);
            border-color: var(--border-hover);
            transform: translateY(-1px);
        }

        .action-btn:active {
            transform: translateY(0);
        }



        @media (max-width: 768px) {
            .preview-canvas {
                padding: 12px;
            }

            .diagram-paper {
                padding: 12px;
            }

            .preview-header {
                height: 36px;
                min-height: 36px;
                padding: 0 10px;
                gap: 6px;
            }

            .action-btn {
                height: 24px;
                width: 24px;
                font-size: 0.75rem;
            }

            .header-controls {
                height: 24px;
            }

            .zoom-controls {
                height: 24px;
                padding: 0 4px;
                gap: 2px;
            }

            .zoom-btn {
                width: 16px;
                height: 16px;
                font-size: 0.75rem;
            }

            .zoom-btn.reset {
                font-size: 0.75rem;
            }

            .zoom-btn.fit {
                width: 24px;
                height: 24px;
                font-size: 1.0rem;
            }

            .zoom-value {
                font-size: 0.7rem;
                min-width: 28px;
                height: 16px;
            }
        }

        @media (max-width: 480px) {
            .preview-header {
                height: 36px;
                min-height: 36px;
                padding: 0 8px;
                gap: 4px;
            }
            .header-controls {
                gap: 4px;
            }
        }

        /* Container queries for dynamic splitter resizing sensitivity */
        @container (max-width: 520px) {
             .title-text {
                display: none !important;
            }

            .action-btn {
                height: 28px;
                width: 28px;
                font-size: 0.9rem;
            }

            .header-controls {
                height: 28px;
            }

            .zoom-controls {
                gap: 4px;
                padding: 0 6px;
                border-radius: 8px;
                height: 28px;
            }

            .zoom-btn {
                width: 20px;
                height: 20px;
                font-size: 0.75rem;
            }


            .zoom-btn.reset {
                font-size: 0.75rem;
            }

            .zoom-btn.fit {
                width: 24px;
                height: 24px;
                font-size: 1.0rem;
            }

            .zoom-value {
                font-size: 0.75rem;
                min-width: 34px;
                height: 20px;
            }
        }

        @container (max-width: 380px) {
            .preview-header {
                height: 36px;
                min-height: 36px;
                padding: 0 8px;
                gap: 4px;
            }

            .header-controls {
                gap: 4px;
            }

            .action-btn {
                height: 24px;
                width: 24px;
                font-size: 0.75rem;
            }

            .header-controls {
                height: 24px;
            }

            .zoom-controls {
                height: 24px;
                padding: 0 4px;
                gap: 2px;
            }

            .zoom-btn {
                width: 14px;
                height: 14px;
                font-size: 0.75rem;
            }

            .zoom-btn.reset {
                font-size: 0.75rem;
            }

            .zoom-btn.fit {
                width: 24px;
                height: 24px;
                font-size: 1.0rem;
            }

            .zoom-value {
                font-size: 0.7rem;
                min-width: 28px;
                height: 16px;
            }
        }

        .canvas-wrapper {
            position: relative;
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
            overflow: hidden;
            width: 100%;
        }

        /* Loading Overlay overlayed on preview canvas */
        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(11, 15, 25, 0.15);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 50;
            animation: fadeIn var(--transition-fast);
        }

        .loading-spinner {
            width: 36px;
            height: 36px;
            border: 3px solid rgba(139, 92, 246, 0.15);
            border-top: 3px solid var(--accent-violet);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }


        /* Disabled state for expand button when no diagram */
        .action-btn:disabled {
            opacity: 0.35;
            cursor: not-allowed;
            transform: none !important;
            background: transparent !important;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes pulse-slow {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.8; }
        }
    `;

    constructor() {
        super();
        this.umlCode = '';
        this.scale = 1.0;
        this.translateX = 0;
        this.translateY = 0;

        // Pan state
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.panX = 0;
        this.panY = 0;

        this._renderTimeout = null;
        this._lastSvgString = null;
        this.controller = new PreviewController(this);
    }

    get compiling() {
        return this.controller.compiling;
    }

    get error() {
        return this.controller.error;
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._renderTimeout) {
            clearTimeout(this._renderTimeout);
        }
    }

    updated(changedProperties) {
        if (changedProperties.has('umlCode')) {
            if (this._renderTimeout) {
                clearTimeout(this._renderTimeout);
            }
            this._renderTimeout = setTimeout(() => {
                this.controller.compile(this.umlCode);
            }, 250); // Debounce diagram rendering slightly for typing smoothness
        }

        const currentSvgString = this.controller.svgString;
        if (currentSvgString !== this._lastSvgString) {
            this._lastSvgString = currentSvgString;
            if (currentSvgString) {
                // Wait a frame for the SVG rendering to settle and layout dimensions to be valid
                requestAnimationFrame(() => {
                    this.fitToScreen();
                });
            } else {
                // Reset transform states
                this.scale = 1.0;
                this.translateX = 0;
                this.translateY = 0;
            }
        }
    }

    applyTransform(smooth = false) {
        const canvas = this.shadowRoot.querySelector('.diagram-paper');
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
        const viewport = this.shadowRoot.querySelector('.preview-canvas');
        const canvas = this.shadowRoot.querySelector('.diagram-paper');
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
        const fitScale = Math.min(scaleX, scaleY, 1.5); // Cap upscaling to 1.5 for aesthetics

        this.scale = fitScale;
        this.translateX = (viewportWidth - svgWidth * fitScale) / 2;
        this.translateY = (viewportHeight - svgHeight * fitScale) / 2;

        this.applyTransform(true);
    }

    resetZoom() {
        const viewport = this.shadowRoot.querySelector('.preview-canvas');
        const canvas = this.shadowRoot.querySelector('.diagram-paper');
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
        const viewport = this.shadowRoot.querySelector('.preview-canvas');
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
        if (e.target.closest('.zoom-controls') || e.target.closest('.header-controls') || e.target.closest('.error-panel') || e.target.closest('.empty-state')) return;

        this.isDragging = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.panX = this.translateX;
        this.panY = this.translateY;

        const viewport = this.shadowRoot.querySelector('.preview-canvas');
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

        const viewport = this.shadowRoot.querySelector('.preview-canvas');
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

            const viewport = this.shadowRoot.querySelector('.preview-canvas');
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
        if (e.target.closest('.zoom-controls') || e.target.closest('.header-controls') || e.target.closest('.error-panel') || e.target.closest('.empty-state')) return;
        this.fitToScreen();
    }

    openLightbox() {
        const svg = this.shadowRoot.querySelector('.notation-display svg');
        if (svg) {
            const modal = document.createElement('lightbox-modal');
            modal.svgNode = svg;
            document.body.appendChild(modal);
        } else {
            this.dispatchEvent(new CustomEvent('show-confirm', {
                detail: {
                    title: 'Notice',
                    message: 'Please create a diagram first!',
                    isAlert: true
                },
                bubbles: true,
                composed: true
            }));
        }
    }

    _parseUMLTitle() {
        if (!this.umlCode) return '';
        const match = this.umlCode.match(/^\s*title\s+(.*)$/mi);
        return match ? match[1].trim() : '';
    }

    handleExportSVG() {
        const svg = this.shadowRoot.querySelector('.notation-display svg');
        if (!svg) {
            this.dispatchEvent(new CustomEvent('show-confirm', {
                detail: {
                    title: 'Notice',
                    message: 'Please create a diagram first!',
                    isAlert: true
                },
                bubbles: true,
                composed: true
            }));
            return;
        }

        try {
            const title = this._parseUMLTitle() || 'diagram';
            const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'diagram';

            // Include namespace if missing
            const clone = svg.cloneNode(true);
            if (clone.getAttribute("xmlns") == null) {
                clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            }
            const svgString = new XMLSerializer().serializeToString(clone);
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${cleanTitle}.svg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            this.dispatchEvent(new CustomEvent('show-confirm', {
                detail: {
                    title: 'Export Failed',
                    message: 'Failed to export SVG: ' + error.message,
                    isAlert: true
                },
                bubbles: true,
                composed: true
            }));
        }
    }

    handleCopySVG() {
        const svg = this.shadowRoot.querySelector('.notation-display svg');
        if (!svg) {
            this.dispatchEvent(new CustomEvent('show-confirm', {
                detail: {
                    title: 'Notice',
                    message: 'Please create a diagram first!',
                    isAlert: true
                },
                bubbles: true,
                composed: true
            }));
            return;
        }

        try {
            const clone = svg.cloneNode(true);
            if (clone.getAttribute("xmlns") == null) {
                clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            }
            const svgString = new XMLSerializer().serializeToString(clone);
            navigator.clipboard.writeText(svgString).then(() => {
                this.dispatchEvent(new CustomEvent('show-confirm', {
                    detail: {
                        title: 'Success',
                        message: '✓ SVG code copied to clipboard!',
                        isAlert: true
                    },
                    bubbles: true,
                    composed: true
                }));
            }).catch(err => {
                console.error("Clipboard API failed, trying fallback:", err);
                const textarea = document.createElement('textarea');
                textarea.value = svgString;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                this.dispatchEvent(new CustomEvent('show-confirm', {
                    detail: {
                        title: 'Success',
                        message: '✓ SVG code copied to clipboard!',
                        isAlert: true
                    },
                    bubbles: true,
                    composed: true
                }));
            });
        } catch (error) {
            this.dispatchEvent(new CustomEvent('show-confirm', {
                detail: {
                    title: 'Copy Failed',
                    message: 'Failed to copy SVG: ' + error.message,
                    isAlert: true
                },
                bubbles: true,
                composed: true
            }));
        }
    }

    render() {
        const hasCode = this.umlCode?.trim().length > 0;
        const zoomPct = Math.round(this.scale * 100);

        return html`
            <div class="preview-container">
                <div class="preview-header">
                    <div class="header-title">
                        📊 <span class="title-text">Diagram Preview</span>
                    </div>
                    
                    <div class="zoom-controls">
                        <button class="zoom-btn" @click="${this.zoomOut}" title="Zoom Out">－</button>
                        <span class="zoom-value">${zoomPct}%</span>
                        <button class="zoom-btn" @click="${this.zoomIn}" title="Zoom In">＋</button>
                        <button class="zoom-btn reset" @click="${this.resetZoom}" title="Actual Size (1:1)">1:1</button>
                        <button class="zoom-btn fit" @click="${this.fitToScreen}" title="Fit to Screen" style="display: flex; align-items: center; justify-content: center;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: block;">
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <polyline points="9 21 3 21 3 15"></polyline>
                                <line x1="21" y1="3" x2="14" y2="10"></line>
                                <line x1="3" y1="21" x2="10" y2="14"></line>
                            </svg>
                        </button>
                    </div>

                    <div class="header-controls">
                        <button class="action-btn" @click="${this.openLightbox}" ?disabled="${!hasCode || !!this.error}" title="View diagram fullscreen">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;pointer-events:none">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-linecap="round" stroke-linejoin="round"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                        <button class="action-btn" @click="${this.handleExportSVG}" ?disabled="${!hasCode || !!this.error}" title="Download diagram as SVG">
                            📥
                        </button>
                        <button class="action-btn" @click="${this.handleCopySVG}" ?disabled="${!hasCode || !!this.error}" title="Copy raw SVG to clipboard">
                            📋
                        </button>
                    </div>
                </div>

                <div class="canvas-wrapper">
                    <div 
                        class="preview-canvas"
                        @pointerdown=${this.onPointerDown}
                        @pointermove=${this.onPointerMove}
                        @pointerup=${this.onPointerUp}
                        @pointercancel=${this.onPointerUp}
                        @wheel=${this.onWheel}
                        @dblclick=${this.onDoubleClick}
                    >
                        ${!hasCode ? html`
                            <div class="empty-state">
                                <img class="empty-icon" src="./favicon.svg" alt="Chartre Logo" />
                                <p>Chartre is ready.<br>Type PlantUML/Mermaid code or choose a Template to begin.</p>
                            </div>
                        ` : html`
                            ${!this.error ? html`
                                <div class="diagram-paper">
                                    <div class="notation-display"></div>
                                </div>
                            ` : ''}
                        `}

                        ${this.error ? html`
                            <div class="error-panel">
                                <div class="error-header">
                                    ❌ Execution Exception
                                </div>
                                <div class="error-message">${this.error}</div>
                            </div>
                        ` : ''}
                    </div>

                    ${this.compiling ? html`
                        <div class="loading-overlay">
                            <div class="loading-spinner"></div>
                        </div>
                    ` : ''}
                </div>

            </div>
        `;
    }
}
customElements.define('preview-component', PreviewComponent);