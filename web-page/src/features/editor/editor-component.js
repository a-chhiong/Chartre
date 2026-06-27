import { LitElement, html, css } from 'lit';
import { PLANTUML_PRESETS, MERMAID_PRESETS } from '../../../public/syntax-template.js';

// Import our custom dedicated component logic controller
import { EditorController } from './editor-controller.js';

export class EditorComponent extends LitElement {
    // Instantiate and bind the dedicated business controller cleanly
    editorCtrl = new EditorController(this);

    static properties = {
        umlCode: { type: String }
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
            max-width: 125px;
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
            overflow: hidden;
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
            box-sizing: border-box;
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
            scrollbar-width: none;
            -ms-overflow-style: none;
        }

        .editor-highlight-pre::-webkit-scrollbar {
            display: none;
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
            white-space: pre;
        }

        .editor-input {
            color: transparent;
            caret-color: var(--accent-violet);
            z-index: 2;
            resize: none;
        }

        .editor-input::placeholder {
            color: var(--text-muted, rgba(255, 255, 255, 0.4));
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
    }

    updated(changedProperties) {
        // Inject highlighted HTML directly into the <code> element
        const codeEl = this.shadowRoot.querySelector('.editor-highlight-code');
        if (codeEl) {
            codeEl.innerHTML = this.editorCtrl.getHighlightedCode();
        }

        // Delegate positioning updates to the controller
        this.editorCtrl.syncScroll();
    }

    render() {
        const ec = this.editorCtrl;
        const family = ec.getFamily();
        const saveTitle = family === 'mermaid' ? 'Save current diagram code as a .mmd file' : 'Save current diagram code as a .puml file';
        const loadTitle = 'Load file from device (.puml, .mmd, .txt)';

        return html`
            <div class="editor-container">
                <div class="editor-header">
                    <div class="header-title">
                        ✏️ <span class="title-text">Editor</span>
                    </div>
                    
                    <div class="presets-wrapper">
                        <select 
                            class="presets-select" 
                            @change="${(e) => ec.handlePresetChange(e)}" 
                            title="Load diagram template"
                        >
                            <option value="" disabled selected>Templates</option>
                            <optgroup label="☕ PlantUML">
                                ${Object.keys(PLANTUML_PRESETS).map(key => html`
                                    <option value="plantuml:${key}">☕ ${key}</option>
                                `)}
                            </optgroup>
                            <optgroup label="🧜‍♀️ Mermaid">
                                ${Object.keys(MERMAID_PRESETS).map(key => html`
                                    <option value="mermaid:${key}">🧜‍♀️ ${key}</option>
                                `)}
                            </optgroup>
                        </select>
                    </div>

                    <div class="header-controls">
                        <input type="file" id="uml-file-input" accept=".puml,.uml,.txt,.mmd,.mermaid" style="display: none;" @change="${(e) => ec.handleLoadUMLFile(e)}">

                        <button
                            class="action-btn toggle-lines-btn ${ec.showLineNumbers ? 'active' : ''}"
                            @click="${() => ec.toggleLineNumbers()}"
                            title="Toggle line numbers"
                        >
                            🔢
                        </button>

                        <button class="action-btn" @click="${() => ec.triggerFileInput()}" title="${loadTitle}">
                            📂
                        </button>
                        <button class="action-btn" @click="${() => ec.handleSaveUMLFile()}" title="${saveTitle}">
                            💾
                        </button>
                        <button class="action-btn danger" @click="${() => ec.handleClear()}" title="Clear all text">
                            🗑️
                        </button>
                    </div>
                </div>

                <div class="editor-content">
                    <div class="editor-body">
                        ${ec.showLineNumbers ? html`
                            <div class="line-numbers-gutter">
                                ${ec.lineNumbers.map(n => html`<div>${n}</div>`)}
                            </div>
                        ` : ''}
                        <div class="editor-highlight-container">
                            <pre class="editor-highlight-pre" aria-hidden="true"><code class="editor-highlight-code language-${family || 'text'}"></code></pre>
                            <textarea
                                class="editor-input"
                                placeholder="Write your PlantUML or Mermaid code here..."
                                spellcheck="false"
                                wrap="off"
                                .value="${this.umlCode || ''}"
                                @input="${(e) => ec.handleInput(e)}"
                                @scroll="${() => ec.syncScroll()}"
                            ></textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
customElements.define('editor-component', EditorComponent);