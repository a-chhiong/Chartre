import LZString from 'lz-string';
import { initializeEngines } from '../services/diagram-engine.js';
import { ensureTextMateEngine } from '../services/textmate-engine.js';

export class AppController {
    constructor(host) {
        // Store host reference and subscribe to its reactive update cycles
        (this.host = host).addController(this);

        // Core business logic states
        this.umlCode = this._loadFromUrl() || this._loadFromStorage() || '';
        this.status = 'Ready';
        this.isError = false;
        this.splitPercentage = 50;
        this.isDragging = false;
        this.isDesktop = this._checkIsDesktop();
        this.isLoading = true;
        this.progress = 0;

        // Confirmation configurations
        this.confirmTitle = 'Confirm';
        this.confirmMessage = '';
        this.confirmText = 'Confirm';
        this.confirmCancelText = 'Cancel';
        this.confirmVariant = 'primary';
        this.isConfirmOpen = false;
        this._onConfirmCallback = null;

        // Bind drag listeners contextually
        this._onDragMove = this.onDragMove.bind(this);
        this._onDragEnd = this.onDragEnd.bind(this);
        this._onWindowResize = () => {
            this.isDesktop = this._checkIsDesktop();
            this.host.requestUpdate();
        };
    }

    hostConnected() {
        window.addEventListener('resize', this._onWindowResize);
        this._initEngines();
    }

    hostDisconnected() {
        window.removeEventListener('resize', this._onWindowResize);
        window.removeEventListener('mousemove', this._onDragMove);
        window.removeEventListener('mouseup', this._onDragEnd);
        window.removeEventListener('touchmove', this._onDragMove);
        window.removeEventListener('touchend', this._onDragEnd);
    }

    async _initEngines() {
        const initPromise = Promise.all([
            initializeEngines(),
            ensureTextMateEngine()
        ]);

        this._progressInterval = setInterval(() => {
            if (this.progress < 90) {
                const inc = Math.random() * 2 + 1;
                this.progress = Math.min(90, this.progress + inc);
                this.host.requestUpdate();
            } else {
                clearInterval(this._progressInterval);
            }
        }, 30);

        try {
            await initPromise;
        } catch (err) {
            console.warn('[Chartre] One or more engines failed to initialize:', err);
        } finally {
            clearInterval(this._progressInterval);
            this.progress = 100;
            this.host.requestUpdate();

            setTimeout(() => {
                this.isLoading = false;
                this.host.requestUpdate();
            }, 300);
        }
    }

    _checkIsDesktop() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        return (w >= 1366 && h >= 768) || (w / h) >= 1.2;
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

    _loadFromStorage() {
        return localStorage.getItem('chartreCode');
    }

    updateUMLCode(newCode) {
        this.umlCode = newCode;
        localStorage.setItem('chartreCode', this.umlCode);

        if (LZString) {
            const compressed = LZString.compressToEncodedURIComponent(this.umlCode);
            const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}#chart/${compressed}`;
            window.history.replaceState({ path: newUrl }, '', newUrl);
        }
        this.host.requestUpdate();
    }

    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;

        window.addEventListener('mousemove', this._onDragMove);
        window.addEventListener('mouseup', this._onDragEnd);
        window.addEventListener('touchmove', this._onDragMove, { passive: false });
        window.addEventListener('touchend', this._onDragEnd);
        this.host.requestUpdate();
    }

    onDragMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const mainEl = this.host.shadowRoot.querySelector('.app-main');
        if (!mainEl) return;

        const rect = mainEl.getBoundingClientRect();
        let percentage;

        if (this.isDesktop) {
            percentage = ((clientX - rect.left) / rect.width) * 100;
        } else {
            percentage = ((rect.bottom - clientY) / rect.height) * 100;
        }

        this.splitPercentage = Math.max(15, Math.min(85, percentage));
        this.host.requestUpdate();
    }

    onDragEnd() {
        this.isDragging = false;

        window.removeEventListener('mousemove', this._onDragMove);
        window.removeEventListener('mouseup', this._onDragEnd);
        window.removeEventListener('touchmove', this._onDragMove);
        window.removeEventListener('touchend', this._onDragEnd);

        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 50);
        this.host.requestUpdate();
    }

    showConfirm(detail) {
        const { title, message, confirmText, cancelText, onConfirm, isAlert, variant } = detail;
        this.confirmTitle = title || (isAlert ? 'Notice' : 'Confirm');
        this.confirmMessage = message || '';
        this.confirmText = confirmText || (isAlert ? 'OK' : 'Confirm');
        this.confirmCancelText = isAlert ? '' : (cancelText || 'Cancel');
        this.confirmVariant = variant || (isAlert ? 'primary' : 'danger');
        this._onConfirmCallback = onConfirm;
        this.isConfirmOpen = true;
        this.host.requestUpdate();
    }

    handleConfirm() {
        if (this._onConfirmCallback) this._onConfirmCallback();
        this.isConfirmOpen = false;
        this.host.requestUpdate();
    }

    handleCancel() {
        this.isConfirmOpen = false;
        this.host.requestUpdate();
    }
}