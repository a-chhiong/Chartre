# Chartre — Premium Client-Side PlantUML Workspace

**Chartre** is a state-of-the-art, fully client-side PlantUML editor and previewer that runs entirely in the browser. Powered by Graphviz WebAssembly (`viz-global.js`) and Java-to-JS compiled PlantUML (`plantuml.js`), it processes and renders diagrams locally with zero external API calls or server dependencies—ensuring complete privacy and ultra-fast preview rendering.

---

## ✨ Key Features

*   **⚡ Real-time Local Compilation**: Diagrams update instantly in the preview panel as you type. All parsing is done locally in your browser.
*   **🎨 Premium Glassmorphism UI**: A gorgeous, modern dark/light themed workspace built with custom CSS variables, responsive split-pane controls, and sleek micro-animations.
*   **📋 Built-in Template Boilerplates**: Insert complete starters in one click:
    *   *Sequence Diagrams*
    *   *Class Diagrams*
    *   *Use Case Diagrams*
    *   *Activity Diagrams*
    *   *State Diagrams*
    *   *Component Diagrams*
    *   *Mind Maps*
*   **🎹 Quick Snippet Insertion**: A slide-up drawer with templates for fast insertion of arrows, lines, actors, databases, classes, notes, logic blocks (`alt`, `opt`, `loop`), and more.
*   **🔗 Compressed Shareable Links**: Instant sharing via URL query parameters (`?uml=...`) powered by `lz-string` compression.
*   **🖼️ Rich Diagram Exports**:
    *   *Download SVG*: Save the diagram locally as a clean, scalable vector asset.
    *   *Copy SVG*: Copies the raw XML SVG markup directly to your clipboard.
    *   *Copy PNG*: Converts the SVG locally to a canvas and copies a high-resolution, theme-matched bitmap PNG directly to your clipboard.
*   **🖥️ स्टैंडअलोन iOS Web App Mode**: Optimized with meta tags for standalone fullscreen usage when added to iOS / Android home screens.

---

## 🛠️ Technology Stack

1.  **Core Framework**: [Lit Element](https://lit.dev/) for fast, lightweight custom components.
2.  **Styles**: Vanilla CSS utilizing custom variables, container queries, and backdrop blur filters.
3.  **Layout Engine**: Graphviz WebAssembly (`viz-global.js`).
4.  **UML Compiler**: Compiled Java-to-JS PlantUML (`plantuml.js`).
5.  **Build Tool**: [Vite](https://vite.dev/) for quick development starts and optimized, lightweight build output.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

Clone the repository and install the dev dependencies:

```bash
npm install
```

### Local Development

Start the Vite local development server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser. Any edits to components or styles will hot-reload automatically.

### Production Build

To compile and optimize the editor for production (e.g. for GitHub Pages deployment):

```bash
npm run build
```

The compiled assets, along with static Graphviz/PlantUML engines, will be outputted to the `dist/` directory.

### Previewing Production Build

To test the compiled production build locally:

```bash
npm run preview
```

---

## 📦 GitHub Pages Deployment

This project is fully static and configured to deploy to GitHub Pages. 

To host the workspace on GitHub Pages:
1. Ensure your Vite configuration is set with the correct base path (usually `./` or the repo name).
2. Commit the `dist` folder or set up a GitHub Actions workflow to run the build and deploy to the `gh-pages` branch.
