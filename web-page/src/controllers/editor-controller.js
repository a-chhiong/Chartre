import { detectDiagramType } from '../services/diagram-engine.js';
import { highlightTextMate } from '../services/textmate-engine.js';
import { PLANTUML_PRESETS, MERMAID_PRESETS } from '../../public/syntax-template.js';

export class EditorController {
    constructor(host) {
        // Bind host component and subscribe to its reactive update cycles
        (this.host = host).addController(this);

        // Standalone editor configurations and logic streams
        this.showLineNumbers = localStorage.getItem('chartreShowLineNumbers') !== 'false';
        this.lineNumbers = [];
    }

    // Lit lifecycle hook that automatically runs before the host's render phase
    hostUpdate() {
        const code = this.host.umlCode || '';
        
        // 1. Calculate incremental line numbers
        const lineCount = Math.max(1, code.split('\n').length);
        this.lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);
    }

    // Handles the overlay backdrop scroll-alignment locking
    syncScroll() {
        const root = this.host.shadowRoot;
        if (!root) return;

        const textarea = root.querySelector('.editor-input');
        if (!textarea) return;

        const gutter = root.querySelector('.line-numbers-gutter');
        if (gutter && this.showLineNumbers) {
            gutter.scrollTop = textarea.scrollTop;
        }

        const backdrop = root.querySelector('.editor-highlight-pre');
        if (backdrop) {
            backdrop.scrollTop = textarea.scrollTop;
            backdrop.scrollLeft = textarea.scrollLeft;
        }
    }

    toggleLineNumbers() {
        this.showLineNumbers = !this.showLineNumbers;
        localStorage.setItem('chartreShowLineNumbers', String(this.showLineNumbers));
        this.host.requestUpdate();
    }

    getHighlightedCode() {
        const code = this.host.umlCode || '';
        const type = detectDiagramType(code);
        // Safely processes text through your Shiki TextMate runtime compiler graph
        return highlightTextMate(code, type);
    }

    handleInput(e) {
        this._dispatchUMLChanged(e.target.value);
    }

    _dispatchUMLChanged(value) {
        this.host.dispatchEvent(new CustomEvent('uml-changed', {
            detail: value,
            bubbles: true,
            composed: true,
        }));
    }

    triggerFileInput() {
        const fileInput = this.host.shadowRoot.getElementById('uml-file-input');
        if (fileInput) {
            fileInput.click();
        }
    }

    handleLoadUMLFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            this._dispatchUMLChanged(content);
            e.target.value = '';
        };
        reader.readAsText(file);
    }

    _parseUMLTitle() {
        const code = this.host.umlCode || '';
        const match = code.match(/^\s*title(?:\s+|:\s*)(.*)$/mi);
        return match ? match[1].trim() : '';
    }

    handleSaveUMLFile() {
        const code = this.host.umlCode || '';
        if (!code || !code.trim()) {
            this.host.dispatchEvent(new CustomEvent('show-confirm', {
                detail: {
                    title: 'Notice',
                    message: 'Please write some diagram code first!',
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

            const type = detectDiagramType(code);
            const ext = type === 'mermaid' ? 'mmd' : 'puml';

            const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${cleanTitle}.${ext}`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            this.host.dispatchEvent(new CustomEvent('show-confirm', {
                detail: {
                    title: 'Error Saving File',
                    message: 'Failed to save file: ' + error.message,
                    isAlert: true
                },
                bubbles: true,
                composed: true
            }));
        }
    }

    handleClear() {
        const code = this.host.umlCode || '';
        if (!code || !code.trim()) return;

        this.host.dispatchEvent(new CustomEvent('show-confirm', {
            detail: {
                title: 'Confirm Clear',
                message: 'This will delete everything in the editor. Are you sure you want to clear all contents? This action cannot be undone.',
                confirmText: 'Clear Editor',
                cancelText: 'Cancel',
                onConfirm: () => {
                    this._dispatchUMLChanged('');
                }
            },
            bubbles: true,
            composed: true
        }));
    }

    handlePresetChange(e) {
        const val = e.target.value;
        if (!val) return;

        const [type, key] = val.split(':');
        let code = '';
        if (type === 'mermaid') {
            code = MERMAID_PRESETS[key];
        } else if (type === 'plantuml') {
            code = PLANTUML_PRESETS[key];
        }

        if (code) {
            this._dispatchUMLChanged(code);
        }

        // Reset dropdown back to the "Templates" placeholder
        e.target.selectedIndex = 0;
    }
}