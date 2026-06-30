import { LitElement, html, css } from 'lit';
import { ViewerController } from './viewer-controller';

export class ViewerComponent extends LitElement {
    static properties = {
        umlCode: { type: String },
        scale: { type: Number, state: true },
        translateX: { type: Number, state: true },
        translateY: { type: Number, state: true },
        desktop: { type: Boolean, reflect: true },
        _toastActive: { type: Boolean, state: true },
        _toastMessage: { type: String, state: true }
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

        .viewer-container {
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
        .viewer-header {
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
            border: 1px solid var(--border-color);
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
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: transparent;
        }

        /* Force rendered SVG to be responsive and fit inside the paper card */
        .notation-display svg {
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            max-height: none !important;
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

        /* Fatal Error Panel (Centred on Screen) */
        .error-panel {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--warning-bg);
            border: 1px solid var(--warning-border);
            border-radius: 12px;
            padding: 16px 20px;
            width: 90%;
            max-width: 600px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 30;
            box-sizing: border-box;
            user-select: text;
            -webkit-user-select: text;
            cursor: default;
        }

        .error-header {
            color: var(--accent-rose);
            font-size: 0.9rem;
            font-weight: 600;
            margin-bottom: 12px;
            user-select: none;
            -webkit-user-select: none;
        }

        .error-message {
            font-family: var(--font-code);
            font-size: 0.8rem;
            color: var(--warning-text);
            line-height: 1.5;
            padding: 12px;
            background: var(--warning-item-bg);
            border-radius: 6px;
            border-left: 4px solid var(--accent-rose);
            white-space: pre-wrap;
            user-select: text;
            -webkit-user-select: text;
            max-height: 250px;
            overflow-y: auto;
            cursor: text;
        }

        /* Override grab cursor inside PlantUML error SVG text elements */
        .diagram-paper.error-state text {
            cursor: text !important;
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

        /* Toast Notification */
        .toast-notification {
            position: absolute;
            bottom: 24px;
            left: 50%;
            transform: translate3d(-50%, 20px, 0);
            background: rgba(17, 24, 39, 0.9);
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 10px 20px;
            border-radius: 30px;
            font-size: 0.85rem;
            font-weight: 500;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 100;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            user-select: none;
            -webkit-user-select: none;
        }

        .toast-notification.active {
            opacity: 1;
            transform: translate3d(-50%, 0, 0);
        }

        /* When paper has an error, allow text selection inside it and its SVG */
        .diagram-paper.error-state,
        .diagram-paper.error-state * {
            user-select: text !important;
            -webkit-user-select: text !important;
        }

        .diagram-paper.error-state {
            border-color: var(--warning-border) !important;
        }
    `;

    constructor() {
        super();
        this.umlCode = '';
        this.scale = 1.0;
        this.translateX = 0;
        this.translateY = 0;
        this._nativeWidth = null;
        this._nativeHeight = null;

        // Pan state
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.panX = 0;
        this.panY = 0;

        this._renderTimeout = null;
        this._lastSvgString = null;
        this._lastError = null;
        this.controller = new ViewerController(this);

        this._toastActive = false;
        this._toastMessage = '';
        this._toastTimeout = null;
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
        const currentError = this.error;
        if (currentSvgString !== this._lastSvgString || currentError !== this._lastError) {
            this._lastSvgString = currentSvgString;
            this._lastError = currentError;
            this._nativeWidth = null;
            this._nativeHeight = null;
            if (currentSvgString || currentError) {
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

    _getSVGDimensions() {
        if (this._nativeWidth && this._nativeHeight) {
            return { width: this._nativeWidth, height: this._nativeHeight };
        }

        const canvas = this.shadowRoot.querySelector('.diagram-paper');
        const svg = canvas?.querySelector('svg');
        if (!svg) {
            return { width: 800, height: 600 };
        }

        let svgWidth = 0;
        let svgHeight = 0;

        const viewBoxAttr = svg.getAttribute('viewBox');
        if (viewBoxAttr) {
            const parts = viewBoxAttr.split(/[\s,]+/).map(Number);
            svgWidth = parts[2];
            svgHeight = parts[3];
        }

        if (!svgWidth || !svgHeight) {
            const bbox = svg.getBBox ? svg.getBBox() : null;
            if (bbox && bbox.width > 0 && bbox.height > 0) {
                svgWidth = bbox.width + bbox.x;
                svgHeight = bbox.height + bbox.y;
            } else {
                svgWidth = svg.clientWidth || 800;
                svgHeight = svg.clientHeight || 600;
            }
        }

        this._nativeWidth = svgWidth;
        this._nativeHeight = svgHeight;
        return { width: svgWidth, height: svgHeight };
    }

    applyTransform(smooth = false) {
        const canvas = this.shadowRoot.querySelector('.diagram-paper');
        if (!canvas) return;

        if (smooth) {
            canvas.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), width 0.2s cubic-bezier(0.4, 0, 0.2, 1), height 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => {
                if (canvas.style.transition && canvas.style.transition.includes('transform')) {
                    canvas.style.transition = 'none';
                }
            }, 200);
        } else {
            canvas.style.transition = 'none';
        }

        const { width, height } = this._getSVGDimensions();
        canvas.style.width = `${width * this.scale}px`;
        canvas.style.height = `${height * this.scale}px`;
        canvas.style.transform = `translate3d(${this.translateX}px, ${this.translateY}px, 0)`;
    }

    fitToScreen() {
        const viewport = this.shadowRoot.querySelector('.preview-canvas');
        const canvas = this.shadowRoot.querySelector('.diagram-paper');
        if (!viewport || !canvas) return;

        const svg = canvas.querySelector('svg');
        if (!svg) return;

        // Reset styles temporarily to read native size
        canvas.style.transform = 'none';
        canvas.style.width = '';
        canvas.style.height = '';

        const displayDiv = canvas.querySelector('.notation-display');
        if (displayDiv) {
            displayDiv.style.width = '';
            displayDiv.style.height = '';
        }

        svg.style.width = '';
        svg.style.height = '';
        svg.style.maxWidth = '';
        svg.style.maxHeight = '';
        svg.removeAttribute('width');
        svg.removeAttribute('height');

        const { width: svgWidth, height: svgHeight } = this._getSVGDimensions();

        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;

        if (viewportWidth === 0 || viewportHeight === 0) return;

        if (displayDiv) {
            displayDiv.style.width = '100%';
            displayDiv.style.height = '100%';
        }
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

        const { width: svgWidth, height: svgHeight } = this._getSVGDimensions();

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
        if (
            e.target.closest('.zoom-controls') || 
            e.target.closest('.header-controls') || 
            e.target.closest('.error-panel') || 
            e.target.closest('.empty-state') ||
            e.target.tagName?.toLowerCase() === 'text'
        ) return;

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
        if (
            e.target.closest('.zoom-controls') || 
            e.target.closest('.header-controls') || 
            e.target.closest('.error-panel') || 
            e.target.closest('.empty-state') ||
            e.target.tagName?.toLowerCase() === 'text'
        ) return;
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

    showToast(message) {
        if (this._toastTimeout) {
            clearTimeout(this._toastTimeout);
        }
        this._toastMessage = message;
        this._toastActive = true;
        this.requestUpdate();
        
        this._toastTimeout = setTimeout(() => {
            this._toastActive = false;
            this.requestUpdate();
        }, 2500);
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
                this.showToast('✓ SVG code copied to clipboard!');
            }).catch(err => {
                console.error("Clipboard API failed, trying fallback:", err);
                const textarea = document.createElement('textarea');
                textarea.value = svgString;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                this.showToast('✓ SVG code copied to clipboard!');
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
            <div class="viewer-container">
                <div class="viewer-header">
                    <div class="header-title">
                        📊 <span class="title-text">Viewer</span>
                    </div>
                    
                    <div class="zoom-controls">
                        <button class="zoom-btn" @click="${this.zoomOut}" ?disabled="${!hasCode || (!!this.error && !this.controller.svgString)}" title="Zoom Out">－</button>
                        <span class="zoom-value">${zoomPct}%</span>
                        <button class="zoom-btn" @click="${this.zoomIn}" ?disabled="${!hasCode || (!!this.error && !this.controller.svgString)}" title="Zoom In">＋</button>
                        <button class="zoom-btn reset" @click="${this.resetZoom}" ?disabled="${!hasCode || (!!this.error && !this.controller.svgString)}" title="Actual Size (1:1)">1:1</button>
                        <button class="zoom-btn fit" @click="${this.fitToScreen}" ?disabled="${!hasCode || (!!this.error && !this.controller.svgString)}" title="Fit to Screen" style="display: flex; align-items: center; justify-content: center;">
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
                            ${this.controller.svgString ? html`
                                <div class="diagram-paper ${this.error ? 'error-state' : ''}">
                                    <div class="notation-display"></div>
                                </div>
                            ` : html`
                                ${this.error ? html`
                                    <div class="error-panel">
                                        <div class="error-header">
                                            ❌ Compilation Error
                                        </div>
                                        <div class="error-message">${this.error}</div>
                                    </div>
                                ` : ''}
                            `}
                        `}
                    </div>

                    ${this.compiling ? html`
                        <div class="loading-overlay">
                            <div class="loading-spinner"></div>
                        </div>
                    ` : ''}

                    <div class="toast-notification ${this._toastActive ? 'active' : ''}">
                        ${this._toastMessage}
                    </div>
                </div>

            </div>
        `;
    }
}
customElements.define('viewer-component', ViewerComponent);