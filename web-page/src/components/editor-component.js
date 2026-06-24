import { LitElement, html, css } from 'lit';
import { detectDiagramType } from './diagram-controller.js';
import { PRESETS } from '../../public/syntax-template.js';

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

        .editor-input {
            flex: 1;            /* Take up remaining width horizontally */
            width: 100%;
            height: 100%;
            min-height: 0;      /* Force overflow boundaries */
            min-width: 0;
            padding: 16px;
            font-family: var(--font-code);
            font-size: 0.85rem;
            color: var(--text-primary);
            background: transparent;
            border: none;
            resize: none;
            line-height: 1.6;
            outline: none;
            overflow-y: auto;
            overflow-x: auto;
            white-space: pre;
            word-wrap: normal;
            tab-size: 4;
            caret-color: var(--accent-violet);
            box-sizing: border-box; /* Essential so padding doesn't create extra scrolling artifacts */
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

            .editor-input {
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
        if (changedProperties.has('showLineNumbers') && this.showLineNumbers) {
            const textarea = this.shadowRoot.querySelector('.editor-input');
            const gutter = this.shadowRoot.querySelector('.line-numbers-gutter');
            if (textarea && gutter) {
                gutter.scrollTop = textarea.scrollTop;
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
        `;
    }
}
