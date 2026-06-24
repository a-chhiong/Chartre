import { LitElement, html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { detectDiagramType } from './diagram-controller.js';
import { PRESETS } from '../../public/syntax-template.js';

// Import PrismJS core and language definitions
import Prism from 'prismjs';
import 'prismjs/components/prism-clike.js';
import 'prismjs/components/prism-plant-uml.js';
import 'prismjs/components/prism-mermaid.js';

export class EditorComponent extends LitElement {
    static properties = {
        umlCode: { type: String },
        showLineNumbers: { type: Boolean },
        lineNumbers: { type: Array, state: true }
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

        .editor-container {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            min-width: 0;
            background: var(--bg-glass);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
        }

        /* Editor Header Panel */
        .editor-header {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            height: 40px;
            padding: 0 16px;
            background: var(--bg-panel-header);
            border-bottom: 1px solid var(--border-color);
            box-sizing: border-box;
            flex-shrink: 0;
            gap: 12px;
            min-width: 0;
        }

        .header-title {
            justify-self: start;
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
        }

        .presets-wrapper {
            justify-self: center;
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
            height: 28px;
            padding: 0 8px;
            border-radius: 6px;
            cursor: pointer;
            transition: all var(--transition-fast);
            outline: none;
            max-width: 200px;
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

        .header-controls {
            justify-self: end;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Action Buttons */
        .action-btn {
            background: var(--midi-btn-bg);
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            font-family: var(--font-ui);
            font-size: 0.9rem;
            font-weight: 600;
            height: 28px;
            width: 28px;
            border-radius: 6px;
            cursor: pointer;
            transition: all var(--transition-fast);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            outline: none;
            box-sizing: border-box;
            flex-shrink: 0;
        }

        .action-btn:hover, .presets-select:hover {
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-primary);
            border-color: var(--border-hover);
        }

        .action-btn.primary {
            background: linear-gradient(135deg, var(--accent-indigo) 0%, var(--accent-violet) 100%);
            border: none;
            color: var(--text-primary);
            box-shadow: 0 2px 8px rgba(139, 92, 246, 0.25);
        }

        .action-btn.primary:hover {
            background: linear-gradient(135deg, var(--accent-indigo) 20%, var(--accent-violet) 100%);
            box-shadow: 0 2px 12px rgba(139, 92, 246, 0.4);
        }

        .action-btn.danger:hover {
            background: rgba(244, 63, 94, 0.15);
            border-color: var(--accent-rose);
            color: var(--accent-rose);
        }

        /* Active state for toolbar toggle buttons */
        .action-btn.active {
            background: linear-gradient(135deg, var(--accent-indigo) 0%, var(--accent-violet) 100%);
            border-color: var(--accent-violet);
            color: var(--text-primary);
            box-shadow: 0 2px 8px rgba(139, 92, 246, 0.35);
        }

        .editor-body {
            display: flex;
            flex: 1;
            min-height: 0;
            position: relative;
            overflow: hidden; /* Encapsulates the children components */
        }

        .line-numbers-gutter {
            width: 48px;
            background: var(--midi-btn-bg);
            border-right: 1px solid var(--border-color);
            color: var(--text-muted);
            font-family: var(--font-code);
            font-size: 0.85rem;
            line-height: 1.6;
            text-align: right;
            padding: 16px 8px 16px 0;
            user-select: none;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
            box-sizing: border-box; /* Ensures padding doesn't distort height calculations */
        }

        .line-numbers-gutter div {
            padding-right: 4px;
        }

        /* Code Editor Input Area */
        .editor-content {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            min-width: 0;
            overflow: hidden;
            position: relative;
        }

        .editor-highlight-container {
            position: relative;
            flex: 1;
            height: 100%;
            min-height: 0;
            min-width: 0;
        }

        .editor-highlight-pre,
        .editor-input {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 16px;
            box-sizing: border-box;
            font-family: var(--font-code);
            font-size: 0.85rem;
            line-height: 1.6;
            tab-size: 4;
            white-space: pre;
            word-wrap: normal;
            overflow: auto;
            border: none;
            outline: none;
            background: transparent;
        }

        .editor-highlight-pre {
            color: var(--text-primary);
            z-index: 1;
            pointer-events: none;
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE 10+ */
        }

        .editor-highlight-pre::-webkit-scrollbar {
            display: none; /* WebKit */
        }

        .editor-highlight-pre code {
            font-family: inherit;
            font-size: inherit;
            line-height: inherit;
            padding: 0;
            margin: 0;
            background: none;
            border: none;
            display: block;
        }

        .editor-input {
            color: transparent;
            caret-color: var(--accent-violet);
            z-index: 2;
            resize: none;
        }

        /* Prism Syntax Token Themes */
        .editor-highlight-pre .token.comment {
            color: var(--code-comment);
            font-style: italic;
        }

        .editor-highlight-pre .token.keyword {
            color: var(--code-keyword);
            font-weight: bold;
        }

        .editor-highlight-pre .token.string {
            color: var(--code-string);
        }

        .editor-highlight-pre .token.operator {
            color: var(--code-operator);
        }

        .editor-highlight-pre .token.punctuation {
            color: var(--code-punctuation);
        }

        .editor-highlight-pre .token.arrow,
        .editor-highlight-pre .token.operator-arrow {
            color: var(--code-operator);
            font-weight: bold;
        }

        .editor-highlight-pre .token.variable,
        .editor-highlight-pre .token.entity {
            color: var(--code-variable);
        }

        .editor-highlight-pre .token.class-name {
            color: var(--code-class);
        }

        .editor-highlight-pre .token.number,
        .editor-highlight-pre .token.boolean {
            color: var(--code-number);
        }

        @media (max-width: 768px) {
            .editor-header {
                height: 36px;
                padding: 0 10px;
            }

            .action-btn {
                height: 24px;
                width: 24px;
                font-size: 0.75rem;
            }

            .editor-highlight-pre, .editor-input {
                font-size: 0.8rem;
                padding: 12px;
            }

            .line-numbers-gutter {
                font-size: 0.8rem;
                padding: 12px 6px 12px 0;
                width: 38px;
            }
        }

        @media (max-width: 480px) {
            .editor-header {
                height: 36px;
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
        }

        @container (max-width: 380px) {
            .editor-header {
                height: 36px;
                padding: 0 8px;
                gap: 6px;
            }

            .header-controls {
                gap: 4px;
            }

            .action-btn {
                height: 24px;
                width: 24px;
                font-size: 0.75rem;
            }
        }

        @media (max-width: 768px) {
            .presets-select {
                height: 24px;
                font-size: 0.75rem;
                max-width: 120px;
            }
        }
        @container (max-width: 380px) {
            .presets-select {
                height: 24px;
                font-size: 0.75rem;
                max-width: 100px;
            }
        }
    `;

    constructor() {
        super();
        this.umlCode = '';
        this.showLineNumbers = localStorage.getItem('chartreShowLineNumbers') !== 'false';
        this.lineNumbers = [];
    }

    willUpdate(changedProperties) {
        if (changedProperties.has('umlCode')) {
            const lineCount = Math.max(1, (this.umlCode || '').split('\n').length);
            this.lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);
        }
    }

    updated(changedProperties) {
        // Sync scroll positions after any update to ensure alignment
        const textarea = this.shadowRoot.querySelector('.editor-input');
        if (textarea) {
            const gutter = this.shadowRoot.querySelector('.line-numbers-gutter');
            if (gutter && this.showLineNumbers) {
                gutter.scrollTop = textarea.scrollTop;
            }
            const backdrop = this.shadowRoot.querySelector('.editor-highlight-pre');
            if (backdrop) {
                backdrop.scrollTop = textarea.scrollTop;
                backdrop.scrollLeft = textarea.scrollLeft;
            }
        }
    }

    toggleLineNumbers() {
        this.showLineNumbers = !this.showLineNumbers;
        localStorage.setItem('chartreShowLineNumbers', String(this.showLineNumbers));
    }

    handleScroll(e) {
        const textarea = e.target;
        const gutter = this.shadowRoot.querySelector('.line-numbers-gutter');
        if (gutter) {
            gutter.scrollTop = textarea.scrollTop;
        }
        const backdrop = this.shadowRoot.querySelector('.editor-highlight-pre');
        if (backdrop) {
            backdrop.scrollTop = textarea.scrollTop;
            backdrop.scrollLeft = textarea.scrollLeft;
        }
    }

    getHighlightedCode() {
        let code = this.umlCode || '';
        
        // If code ends with a newline, append a trailing space to prevent scroll height mismatch
        if (code.endsWith('\n')) {
            code += ' ';
        }

        const type = detectDiagramType(code);

        if (type === 'plantuml') {
            try {
                return unsafeHTML(Prism.highlight(code, Prism.languages.plantuml, 'plantuml'));
            } catch (err) {
                console.error("Prism PlantUML highlighting failed:", err);
            }
        } else if (type === 'mermaid') {
            try {
                return unsafeHTML(Prism.highlight(code, Prism.languages.mermaid, 'mermaid'));
            } catch (err) {
                console.error("Prism Mermaid highlighting failed:", err);
            }
        }

        const escaped = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return unsafeHTML(escaped);
    }



    handleInput(e) {
        this._dispatchUMLChanged(e.target.value);
    }

    _dispatchUMLChanged(value) {
        this.dispatchEvent(new CustomEvent('uml-changed', {
            detail: value,
            bubbles: true,
            composed: true,
        }));
    }

    triggerFileInput() {
        const fileInput = this.shadowRoot.getElementById('uml-file-input');
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
            this.umlCode = content;
            this._dispatchUMLChanged(content);
            e.target.value = '';
        };
        reader.readAsText(file);
    }

    _parseUMLTitle() {
        if (!this.umlCode) return '';
        const match = this.umlCode.match(/^\s*title(?:\s+|:\s*)(.*)$/mi);
        return match ? match[1].trim() : '';
    }

    handleSaveUMLFile() {
        if (!this.umlCode || !this.umlCode.trim()) {
            alert('Please write some diagram code first!');
            return;
        }

        try {
            const title = this._parseUMLTitle() || 'diagram';
            const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'diagram';

            const type = detectDiagramType(this.umlCode);
            const ext = type === 'mermaid' ? 'mmd' : 'puml';

            const blob = new Blob([this.umlCode], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${cleanTitle}.${ext}`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            alert('Failed to save file: ' + error.message);
        }
    }

    handleClear() {
        if (!this.umlCode || !this.umlCode.trim()) return;

        if (confirm('⚠️ WARNING: This will delete everything in the editor.\n\nAre you sure you want to clear all contents? This action cannot be undone.')) {
            this.umlCode = '';
            this._dispatchUMLChanged('');
        }
    }

    handlePresetChange(e) {
        const val = e.target.value;
        if (!val) return;
        const code = PRESETS[val];
        if (code) {
            this.umlCode = code;
            this._dispatchUMLChanged(code);
        }
        e.target.value = '';
    }

    render() {
        const type = detectDiagramType(this.umlCode);
        const saveTitle = type === 'mermaid' ? 'Save current diagram code as a .mmd file' : 'Save current diagram code as a .puml file';
        const loadTitle = 'Load file from device (.puml, .mmd, .txt)';

        return html`
            <div class="editor-container">
                <div class="editor-header">
                    <div class="header-title">
                        ✏️ <span class="title-text">Editor</span>
                    </div>
                    
                    <div class="presets-wrapper">
                        <select class="presets-select" @change="${this.handlePresetChange}" title="Load diagram template">
                            <option value="" disabled selected>模板 (Templates)</option>
                            <optgroup label="☕ PlantUML">
                                <option value="sequence">☕ Sequence</option>
                                <option value="class">☕ Class</option>
                                <option value="usecase">☕ Use Case</option>
                                <option value="activity">☕ Activity</option>
                                <option value="state">☕ State</option>
                                <option value="component">☕ Component</option>
                                <option value="mindmap">☕ Mind-Map</option>
                            </optgroup>
                            <optgroup label="🧜‍♀️ Mermaid">
                                <option value="mermaid_flowchart">🧜‍♀️ Flowchart</option>
                                <option value="mermaid_sequence">🧜‍♀️ Sequence</option>
                                <option value="mermaid_class">🧜‍♀️ Class</option>
                                <option value="mermaid_state">🧜‍♀️ State</option>
                                <option value="mermaid_er">🧜‍♀️ Entity Relationship</option>
                                <option value="mermaid_gantt">🧜‍♀️ Gantt</option>
                                <option value="mermaid_mindmap">🧜‍♀️ Mindmap</option>
                            </optgroup>
                        </select>
                    </div>

                    <div class="header-controls">
                        <input type="file" id="uml-file-input" accept=".puml,.uml,.txt,.mmd,.mermaid" style="display: none;" @change="${this.handleLoadUMLFile}">

                        <button
                            class="action-btn toggle-lines-btn ${this.showLineNumbers ? 'active' : ''}"
                            @click="${this.toggleLineNumbers}"
                            title="Toggle line numbers"
                        >
                            🔢
                        </button>

                        <button class="action-btn" @click="${this.triggerFileInput}" title="${loadTitle}">
                            📂
                        </button>
                        <button class="action-btn" @click="${this.handleSaveUMLFile}" title="${saveTitle}">
                            💾
                        </button>
                        <button class="action-btn danger" @click="${this.handleClear}" title="Clear all text">
                            🗑️
                        </button>
                    </div>
                </div>

                <div class="editor-content">
                    <div class="editor-body">
                        ${this.showLineNumbers ? html`
                            <div class="line-numbers-gutter">
                                ${this.lineNumbers.map(n => html`<div>${n}</div>`)}
                            </div>
                        ` : ''}
                        <div class="editor-highlight-container">
                            <pre class="editor-highlight-pre" aria-hidden="true"><code class="language-${type || 'text'}">${this.getHighlightedCode()}</code></pre>
                            <textarea
                                class="editor-input"
                                placeholder="Write your PlantUML or Mermaid here (e.g. starting with @startuml or flowchart TD)..."
                                spellcheck="false"
                                wrap="off"
                                .value="${this.umlCode}"
                                @input="${this.handleInput.bind(this)}"
                                @scroll="${this.handleScroll}"
                            ></textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
