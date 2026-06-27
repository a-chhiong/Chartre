import { LitElement, html, css } from 'lit';

export class AppLoader extends LitElement {
    static properties = {
        progress: { type: Number }
    };

    static styles = css`
        :host {
            display: flex;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--bg-app-gradient);
            align-items: center;
            justify-content: center;
            z-index: 99999;
            box-sizing: border-box;
        }

        .loader-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
            padding: 40px;
            background: var(--bg-glass);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            box-shadow: var(--shadow-glass);
            max-width: 320px;
            width: 90%;
            text-align: center;
            box-sizing: border-box;
        }

        .loader-logo {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }

        .pulse-logo {
            width: 64px;
            height: 64px;
            animation: loader-pulse 2s infinite ease-in-out;
        }

        h1 {
            font-size: 1.8rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--text-primary) 30%, var(--accent-violet) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 0;
            font-family: var(--font-ui);
        }

        .loader-bar {
            width: 100%;
            height: 6px;
            background: var(--midi-progress-bg);
            border-radius: 99px;
            overflow: hidden;
            position: relative;
        }

        .loader-progress {
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, var(--accent-indigo) 0%, var(--accent-violet) 100%);
            border-radius: 99px;
            transition: width 0.15s ease-out;
        }

        .loader-status {
            font-size: 0.8rem;
            color: var(--text-secondary);
            margin: 0;
            font-weight: 500;
            font-family: var(--font-ui);
        }

        @keyframes loader-pulse {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.15)); }
            50% { transform: scale(1.08); filter: drop-shadow(0 0 16px rgba(139, 92, 246, 0.45)); }
        }
    `;

    constructor() {
        super();
        this.progress = 0;
    }

    render() {
        return html`
            <div class="loader-content">
                <div class="loader-logo">
                    <img src="./favicon.svg" alt="Chartre Logo" class="pulse-logo" />
                    <h1>Chartre</h1>
                </div>
                <div class="loader-bar">
                    <div class="loader-progress" style="width: ${this.progress}%"></div>
                </div>
                <p class="loader-status">Initializing diagram workspace...</p>
            </div>
        `;
    }
}
customElements.define('app-loader', AppLoader);