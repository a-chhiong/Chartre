/**
 * Diagram Engine — unified auto-gear rendering interface.
 * 
 * Callers pass raw code in, the engine detects the family and renders.
 * No manual gear selection needed — detection is internal.
 * 
 * Public API:
 *   renderDiagram(code, options?) → Promise<string>  (SVG)
 *   detectFamily(code)            → 'plantuml'|'mermaid'|null
 *   initializeEngines()           → Promise<void>    (pre-warm)
 */

import { detectDiagramType } from './syntax-registry.js';

// ─── Lightweight Queries (synchronous) ──────────────────────────────────────

/**
 * Returns the diagram family for the given code.
 * Useful for UI decisions (file extensions, tooltips, icons) without
 * exposing the full detection object or the registry itself.
 * 
 * @param {string} code - Raw diagram source code
 * @returns {'plantuml'|'mermaid'|null}
 */
export function detectFamily(code) {
    return detectDiagramType(code).family;
}

// ─── Engine Singletons ──────────────────────────────────────────────────────

let plantumlLoadingPromise = null;
let plantumlInstance = null;

let mermaidLoadingPromise = null;
let mermaidInstance = null;

// ─── Lazy Loaders (internal) ────────────────────────────────────────────────

function loadPlantUML() {
    if (plantumlInstance) return Promise.resolve(plantumlInstance);
    if (!plantumlLoadingPromise) {
        plantumlLoadingPromise = (async () => {
            // Load the Graphviz layout engine and expose it globally (required by PlantUML)
            const viz = await import('@plantuml/core/viz-global.js');
            window.Viz = viz.default || viz;
            console.log("PlantUML layout engine (window.Viz) initialized:", window.Viz);
            
            // Load the PlantUML core engine
            const module = await import('@plantuml/core');
            plantumlInstance = module.renderToString || module.render;
            return plantumlInstance;
        })();
    }
    return plantumlLoadingPromise;
}

function loadMermaid() {
    if (mermaidInstance) return Promise.resolve(mermaidInstance);
    if (!mermaidLoadingPromise) {
        mermaidLoadingPromise = (async () => {
            const module = await import('mermaid');
            mermaidInstance = module.default || module;
            
            mermaidInstance.initialize({
                startOnLoad: false,
                securityLevel: 'loose',
                theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
                fontFamily: 'Plus Jakarta Sans, system-ui, -apple-system, sans-serif',
                sequence: {
                    fontFamily: 'Plus Jakarta Sans, system-ui, -apple-system, sans-serif',
                    actorFontFamily: 'Plus Jakarta Sans, system-ui, -apple-system, sans-serif',
                    noteFontFamily: 'Plus Jakarta Sans, system-ui, -apple-system, sans-serif',
                    messageFontFamily: 'Plus Jakarta Sans, system-ui, -apple-system, sans-serif',
                },
            });
            return mermaidInstance;
        })();
    }
    return mermaidLoadingPromise;
}

// ─── Renderers (internal) ───────────────────────────────────────────────────

/**
 * Renders PlantUML code to SVG.
 * Wraps the callback-based @plantuml/core API into a Promise.
 */
async function renderPlantUML(code, options = {}) {
    const render = await loadPlantUML();
    const lines = code.split(/\r\n|\r|\n/);
    const dark = options.dark ?? (document.documentElement.getAttribute('data-theme') === 'dark');

    return new Promise((resolve, reject) => {
        render(
            lines,
            (svgOutput) => resolve(svgOutput),
            (err) => reject(err instanceof Error ? err : new Error(err?.message || String(err))),
            { dark }
        );
    });
}

/**
 * Renders Mermaid code to SVG.
 * Handles DOM cleanup for leftover error elements.
 */
async function renderMermaid(code) {
    const id = 'mermaid-svg-' + Math.floor(Math.random() * 1000000);

    // Clear any leftover mermaid error elements in body
    const badge = document.getElementById('dmermaid-svg');
    if (badge) badge.remove();

    try {
        const m = await loadMermaid();
        const { svg } = await m.render(id, code);
        return svg;
    } catch (err) {
        // Remove the temp div created by mermaid on failure
        const tempDiv = document.getElementById('d' + id);
        if (tempDiv) tempDiv.remove();

        // Normalize mermaid's varied error shapes
        const message = err?.str || err?.message || String(err);
        throw new Error(message);
    }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * @typedef {object} RenderResult
 * @property {string} svg - The rendered SVG string
 * @property {'plantuml'|'mermaid'} family - The detected diagram family
 * @property {string|null} languageId - The resolved syntax language ID
 */

/**
 * Universal auto-gear diagram renderer.
 * Detects the diagram type from the code, loads the appropriate engine, and renders.
 * 
 * @param {string} code - Raw diagram source code
 * @param {object} [options] - Render options
 * @param {boolean} [options.dark] - Force dark mode (PlantUML). Auto-detected if omitted.
 * @returns {Promise<RenderResult>} Rendered SVG with detection metadata
 * @throws {Error} On compilation failure or unrecognized syntax
 */
export async function renderDiagram(code, options = {}) {
    const trimmed = code?.trim();
    if (!trimmed) {
        throw new Error('No diagram code provided.');
    }

    const detection = detectDiagramType(trimmed);

    switch (detection.family) {
        case 'plantuml': {
            const svg = await renderPlantUML(trimmed, options);
            return { svg, family: 'plantuml', languageId: detection.languageId };
        }
        case 'mermaid': {
            const svg = await renderMermaid(trimmed, options);
            return { svg, family: 'mermaid', languageId: detection.languageId };
        }
        default:
            throw new Error(
                `Unrecognized syntax format.\n` +
                `Please check your syntax:\n` +
                `• PlantUML: Start your diagram with '@startuml' and end with '@enduml'.\n` +
                `• Mermaid: Start with a supported diagram keyword (e.g., 'flowchart TD', 'sequenceDiagram', 'classDiagram', 'stateDiagram-v2').`
            );
    }
}

/**
 * Pre-initializes both engines in parallel.
 * Called at app startup to warm up the WASM/JS runtimes before the user types.
 */
export async function initializeEngines() {
    try {
        await Promise.all([
            loadPlantUML(),
            loadMermaid()
        ]);
        console.log("Diagram engines pre-initialized successfully");
    } catch (err) {
        console.error("Failed to pre-initialize diagram engines:", err);
    }
}
