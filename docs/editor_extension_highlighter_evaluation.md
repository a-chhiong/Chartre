# Evaluation: VS Code Extension Syntax Highlighting & Web Adaptation

This report evaluates how the popular Visual Studio Code extensions **`vscode-plantuml`** (by `qjebbs`) and **`vscode-mermaid-chart`** (by `Mermaid Chart`) handle syntax highlighting and assesses how we can leverage their resources in a web environment like **Chartre**.

---

## 1. How the Extensions Handle Highlighting

VS Code handles syntax highlighting via two steps: **Tokenization** (using TextMate regex engines) and **Theming** (mapping tokens to editor themes). 

### A. VS Code PlantUML (`qjebbs/vscode-plantuml`)
*   **Mechanism:** Implements a comprehensive **TextMate Grammar** (written in JSON/XML Plist format) located at `./syntaxes/plantuml.tmLanguage`.
*   **Depth of Grammar:** Highly detailed. It uses VS Code's native Oniguruma regex engine (which supports advanced recursive matches, lookbehinds, and backreferences) to parse nested constructs, including:
    *   Skinparam parameters and configuration blocks.
    *   Participant declarations and alias bindings (`participant Alice as A`).
    *   Varied arrow connectors (`->`, `-->`, `o<-[#red]-`, etc.).
    *   Stereotypes (`<<Entity>>`), notes, macros (`!define`, `!include`), and inline styles.
*   **Markdown Injection:** Features a `./syntaxes/codeblock.json` file which injects the PlantUML grammar into standard Markdown files whenever a ````plantuml` block is encountered.

### B. VS Code Mermaid Chart (`Mermaid-Chart/vscode-mermaid-chart`)
*   **Mechanism:** Registers language configurations (`.mmd`, `.mermaid`) in `package.json` and maps them to standard configuration patterns (brackets, auto-closing pairs).
*   **Highlighting Engine:** It relies on registering standard **TextMate grammars** (similar to those in community extensions like `bpruitt-goddard/vscode-mermaid-syntax-highlight`) to colorize Mermaid diagrams.
*   **Depth of Grammar:** Captures diagram structural keywords (`flowchart`, `sequenceDiagram`, `erDiagram`, `gantt`), node shapes (`[Node]`, `(Node)`, `([Node])`), connector types (`-->`, `-.->`, `==>`), styling classes, and syntax parameters.

---

## 2. Resources We Can Extract & Reuse

Since these extensions rely on standard **TextMate Grammars** (`.tmLanguage.json`), the primary resource we can extract is the raw regex rules defining the syntax scopes.

### Option 1: Migrate to Monaco Editor (Recommended)
Because Monaco Editor is the web core of Visual Studio Code, it is designed to run the same language configurations and layouts natively in the browser. 
*   **Monarch (Monaco's Native Engine):** Monaco uses **Monarch**, a declarative, JSON-based state machine highlighting system. It uses standard JavaScript regular expressions and operates natively on the JS engine.
*   **Community Monarch Files:** There are excellent pre-built Monarch files for PlantUML (`@sinm/monaco-plantuml`) and Mermaid (`monaco-mermaid`) that we can install via npm. This would immediately give us VS Code-equivalent highlighting, code completion, error underlining, and folding.

### Option 2: Run TextMate Grammars directly via Shiki (or `monaco-textmate`)
*   **How it works:** **Shiki** (and other TextMate tokenizers) run the exact TextMate `.tmLanguage.json` grammars from VS Code extensions. To do this in a browser, it compiles the standard C-based Oniguruma regex engine to WebAssembly (`onig.wasm`) and runs the tokenization stack.
*   **Integration:** We can download the `.tmLanguage.json` files directly from the `vscode-plantuml` and `vscode-mermaid-chart` repositories and feed them to Shiki (or configure `monaco-textmate` to run them inside Monaco).
*   **Trade-off:** Running WebAssembly-compiled regex engines in the browser is very heavy. Doing this on every keystroke inside an active textarea can add noticeable typing lag.

### Option 3: Enhance PrismJS Grammars (Low Overhead)
If we want to keep the current lightweight `<textarea>` implementation, we can look at the regex patterns inside the extensions' `.tmLanguage.json` files and manually copy the regular expressions for missing elements into our Prism config.

---

## Technical Comparison: TextMate vs. Monaco (Monarch)

Understanding the technical divergence between these two approaches is essential when building a high-fidelity web code editor:

| Feature | TextMate Approach (VS Code / Shiki) | Monaco Monarch Approach (Monaco Native) |
| :--- | :--- | :--- |
| **Engine Architecture** | Stack-based state machine using Oniguruma regex (C-library compiled to WebAssembly). | Regex state machine using native JavaScript `RegExp` engine. |
| **Highlighting Accuracy**| **Extremely High**. Handles complex multiline, nested, and recursive language blocks (e.g. matching bracket depths, nested tags). | **High / Medium**. Highly precise, but because it operates line-by-line using standard JS regex, it can occasionally fail on complex recursive structures. |
| **Browser Performance** | **Heavy**. Requires loading, compiling, and running a WASM binary (`onig.wasm`), which consumes more memory and adds input lag during fast typing. | **Light / Instant**. Zero compilation overhead, executes at the browser's native JavaScript speed. |
| **Setup & Bundle Size** | High overhead (~500 KB WASM payload + tokenizer JS library + grammar files). | Low overhead (uses Monaco's built-in APIs, grammar configurations are small JSON definitions). |
| **Theme Customization** | Relies on VS Code `.json` color themes (VS Code styles maps scopes to color tokens). | Uses Monaco's `defineTheme` CSS rules mapping token names to colors directly. |

*   **Example (PlantUML arrows/keywords):** We can extend `Prism.languages.plantuml` to support complex participant bindings and skinparam settings by porting the regex patterns from `vscode-plantuml`'s grammar.

---

## Summary Recommendation

If PrismJS's highlighting feels basic and incomplete, it is due to the inherent limits of Prism's simple flat regular expression matching. To achieve professional, VS Code-quality syntax highlighting, auto-completion, and bracket-matching:

1.  **Switch the code editor component to Monaco Editor.**
2.  Install and register community Monarch grammar packages (`@sinm/monaco-plantuml` and `monaco-mermaid`).
3.  This leverages the same language definitions as the VS Code extensions without the performance overhead of running TextMate WASM in a textarea.
