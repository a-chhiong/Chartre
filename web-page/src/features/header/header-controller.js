import LZString from 'lz-string';

export class HeaderController {
    constructor(host) {
        (this.host = host).addController(this);

        // Controller state
        this.isFullscreen = false;
        this.shareSuccess = false;
        this.currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        this._fauxFullscreen = false;

        // Bind event handlers
        this._onFullscreenChange = this._handleFullscreenChange.bind(this);
    }

    hostConnected() {
        document.addEventListener('fullscreenchange', this._onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', this._onFullscreenChange);
    }

    hostDisconnected() {
        document.removeEventListener('fullscreenchange', this._onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', this._onFullscreenChange);
    }

    // --- Fullscreen logic ---

    _handleFullscreenChange() {
        this.isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
        this.host.requestUpdate();
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
            this.host.requestUpdate();
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

        // Faux fullscreen fallback for unsupported environments
        el.classList.add('faux-fullscreen');
        this._fauxFullscreen = true;
        this.isFullscreen = true;
        this.host.requestUpdate();
    }

    // --- Theme logic ---

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);

        if (newTheme === 'dark') {
            document.documentElement.classList.add('sl-theme-dark');
        } else {
            document.documentElement.classList.remove('sl-theme-dark');
        }

        localStorage.setItem('chartreTheme', newTheme);
        this.currentTheme = newTheme;
        this.host.requestUpdate();

        // Dispatch a global event so dynamic assets (like diagrams) can render with correct theme
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: newTheme } }));
    }

    // --- Share logic ---

    async handleShare(umlCode) {
        try {
            let shareUrl = window.location.href;

            if (LZString && umlCode) {
                const compressed = LZString.compressToEncodedURIComponent(umlCode);
                shareUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}#chart/${compressed}`;
                window.history.replaceState({ path: shareUrl }, '', shareUrl);
            }

            await this._copyTextToClipboard(shareUrl);
            this.shareSuccess = true;
            this.host.requestUpdate();

            setTimeout(() => {
                this.shareSuccess = false;
                this.host.requestUpdate();
            }, 2000);
        } catch (err) {
            console.error('Failed to copy URL:', err);
        }
    }

    // --- Clipboard utility ---

    async _copyTextToClipboard(text) {
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
}
