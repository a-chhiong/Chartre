#!/usr/bin/env node

/**
 * Token Parity Test Bench
 *
 * Compares syntax token classification between:
 *   - Chartre: Shiki (TextMate grammars) → CSS variable via variablePrefix '--syntax-'
 *   - Spectre: CodeMirror StreamLanguage → CSS variable via HighlightStyle
 *
 * Both engines should produce the SAME resolved CSS variable (color) for each token.
 * This script tokenizes sample PlantUML and Mermaid code through both engines
 * and reports any mismatches.
 *
 * Usage:  node tools/token-parity-test.mjs
 */

import { createHighlighter, createCssVariablesTheme } from 'shiki';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GRAMMAR_DIR = path.resolve(__dirname, '../web-page/public/syntaxes');

// ─────────────────────────────────────────────────────────
//  TEST SAMPLES — PlantUML and Mermaid snippets
// ─────────────────────────────────────────────────────────

const PLANTUML_SAMPLE = `@startuml Sequence
title Online Shopping Sequence

actor Customer
participant "Web Portal" as Portal
database "Inventory DB" as DB
participant "Payment Gateway" as Gateway

Customer -> Portal: Search for item
Portal -> DB: Query stock
DB --> Portal: Item available
Portal --> Customer: Display item & Buy button

Customer -> Portal: Click Buy Item
Portal -> Gateway: Authorize payment
Gateway --> Portal: Payment successful
Portal -> DB: Decrement stock count
Portal --> Customer: Show Order Confirmation page
@enduml`;

const MERMAID_SAMPLE = `sequenceDiagram
    actor Customer
    participant Portal as Web Portal
    participant DB as Inventory DB
    participant Gateway as Payment Gateway

    Customer->>Portal: Search for item
    Portal->>DB: Query stock
    DB-->>Portal: Item available
    Portal-->>Customer: Display item & Buy button

    Customer->>Portal: Click Buy Item
    Portal->>Gateway: Authorize payment
    Gateway-->>Portal: Payment successful
    Portal->>DB: Decrement stock count
    Portal-->>Customer: Show Order Confirmation page`;

// ─────────────────────────────────────────────────────────
//  SHIKI (TextMate) TOKENIZER — same approach as Chartre
// ─────────────────────────────────────────────────────────

/**
 * Shiki CSS Variables Theme maps TextMate scopes to CSS variables.
 * The variablePrefix '--syntax-' produces variables like:
 *   keyword.* → --syntax-token-keyword
 *   string.*  → --syntax-token-string
 *   comment.* → --syntax-token-comment
 *   etc.
 *
 * We use Shiki's `codeToTokens` API to get per-token color info.
 * The token.color field returns the CSS variable name directly.
 */

// CSS variable → unified color key mapping
const SHIKI_VAR_TO_COLOR_KEY = {
  'var(--syntax-token-keyword)': 'keyword',
  'var(--syntax-token-string)': 'string',
  'var(--syntax-token-string-expression)': 'string',
  'var(--syntax-token-comment)': 'comment',
  'var(--syntax-token-constant)': 'constant',
  'var(--syntax-token-function)': 'function',
  'var(--syntax-token-punctuation)': 'foreground',  // punctuation = foreground color
  'var(--syntax-token-variable)': 'variable',
  'var(--syntax-token-operator)': 'keyword',  // same color as keyword in our palette
  'var(--syntax-token-class)': 'type',
  'var(--syntax-token-entity)': 'entity',
  'var(--syntax-token-storage)': 'keyword',
  'var(--syntax-token-support)': 'constant',
  'var(--syntax-token-meta)': 'foreground',
  'var(--syntax-token-markup)': 'constant',
  'var(--syntax-foreground)': 'foreground',
};

/**
 * Tokenize code with Shiki and return an array of { text, colorKey } per line.
 * Uses token.color which returns the CSS variable directly.
 */
async function tokenizeWithShiki(highlighter, code, lang) {
  const result = highlighter.codeToTokens(code, {
    lang,
    theme: 'test-theme',
    includeExplanation: true
  });

  const lines = [];
  for (const line of result.tokens) {
    const lineTokens = [];
    for (const token of line) {
      const cssVar = token.color || 'var(--syntax-foreground)';
      const colorKey = SHIKI_VAR_TO_COLOR_KEY[cssVar] || 'foreground';
      lineTokens.push({ text: token.content, colorKey });
    }
    lines.push(lineTokens);
  }
  return lines;
}

// ─────────────────────────────────────────────────────────
//  CODEMIRROR (StreamLanguage) TOKENIZER — same as Spectre
// ─────────────────────────────────────────────────────────

/**
 * Minimal StreamLanguage runner that simulates CodeMirror's tokenization
 * without needing the full editor DOM. We execute the token() function
 * character by character, collecting token spans.
 *
 * CodeMirror token tag → unified color key mapping:
 *   "keyword"      → keyword
 *   "operator"     → operator (now same as keyword in our palette)
 *   "string"       → string
 *   "comment"      → comment
 *   "number"       → number
 *   "variableName" → variable
 *   "typeName"     → type
 *   "meta"         → meta
 *   "atom"         → constant
 *   "bool"         → constant
 *   null           → foreground
 */

const CM_TAG_TO_COLOR_KEY = {
  'keyword': 'keyword',
  'operator': 'keyword',    // in our shared palette, operator = keyword color
  'string': 'string',
  'comment': 'comment',
  'number': 'number',
  'variableName': 'variable',
  'typeName': 'type',
  'labelName': 'function',
  'meta': 'meta',
  'atom': 'constant',
  'bool': 'constant',
  'null': 'constant',
};

/**
 * Minimal stream object that mimics CodeMirror's StringStream for tokenization.
 */
class SimpleStream {
  constructor(line) {
    this.string = line;
    this.pos = 0;
    this.start = 0;
  }

  eatSpace() {
    const match = this.string.slice(this.pos).match(/^\s+/);
    if (match) {
      this.pos += match[0].length;
      return true;
    }
    return false;
  }

  match(pattern, consume = true) {
    if (typeof pattern === 'string') {
      if (this.string.slice(this.pos).startsWith(pattern)) {
        if (consume) this.pos += pattern.length;
        return [pattern];
      }
      return null;
    }
    const m = this.string.slice(this.pos).match(pattern);
    if (m && m.index === 0) {
      if (consume) this.pos += m[0].length;
      return m;
    }
    return null;
  }

  next() {
    if (this.pos < this.string.length) {
      return this.string.charAt(this.pos++);
    }
    return undefined;
  }

  skipToEnd() {
    this.pos = this.string.length;
  }

  current() {
    return this.string.slice(this.start, this.pos);
  }

  eol() {
    return this.pos >= this.string.length;
  }
}

/**
 * Tokenize code using a StreamLanguage-style tokenizer definition.
 * Returns the same format as Shiki: array of lines, each with { text, colorKey }.
 */
function tokenizeWithStreamLanguage(langDef, code) {
  const lines = code.split('\n');
  const state = langDef.startState ? langDef.startState() : {};
  const result = [];

  for (const line of lines) {
    const stream = new SimpleStream(line);
    const lineTokens = [];

    while (!stream.eol()) {
      stream.start = stream.pos;
      const tag = langDef.token(stream, state);

      // If token() didn't advance, force advance to prevent infinite loop
      if (stream.pos === stream.start) {
        stream.next();
      }

      const text = stream.current();
      if (text) {
        const colorKey = tag ? (CM_TAG_TO_COLOR_KEY[tag] || 'foreground') : 'foreground';
        lineTokens.push({ text, colorKey });
      }
    }

    result.push(lineTokens);
  }

  return result;
}

// ─────────────────────────────────────────────────────────
//  SPECTRE TOKENIZER DEFINITIONS (extracted from highlight-handler.js)
// ─────────────────────────────────────────────────────────

const plantumlKeywords = new Set([
  "abstract", "action", "across", "activate", "actor", "again", "agent",
  "allow_mixing", "allowmixing", "also", "alt", "annotation", "archimate",
  "artifact", "as", "attribute", "attributes", "autonumber",
  "bold", "boundary", "bottom", "box", "break",
  "caption", "card", "center", "circle", "circled", "circles", "class",
  "cloud", "collections", "color", "component", "concise", "control",
  "create", "critical",
  "dashed", "database", "deactivate", "description", "destroy", "detach",
  "diamond", "dotted", "down",
  "else", "elseif", "empty", "end", "endcaption", "endfooter", "endheader",
  "endif", "endlegend", "endtitle", "endwhile", "entity", "enum", "exception",
  "false", "field", "fields", "file", "folder", "footbox", "footer", "fork",
  "frame",
  "group",
  "header", "hexagon", "hide", "hnote",
  "if", "interface", "is", "italic",
  "json",
  "kill",
  "label", "left", "legend", "link", "loop",
  "mainframe", "map", "member", "members", "metaclass", "method", "methods",
  "namespace", "newpage", "node", "normal", "note",
  "object", "of", "on", "opt", "order", "over",
  "package", "page", "par", "participant", "partition", "person", "plain",
  "private", "process", "protected", "protocol", "public",
  "queue",
  "rectangle", "ref", "relationship", "repeat", "return", "right", "rnote",
  "robust", "rotate",
  "show", "skin", "skinparam", "split", "sprite", "stack", "start", "state",
  "stereotype", "stereotypes", "stop", "storage", "struct", "style",
  "then", "title", "together", "top", "true",
  "up", "usecase",
  "while",
  "starts", "ends", "closed", "after", "colored", "lasts", "happens", "in",
  "at", "are", "to", "the", "and", "printscale", "ganttscale", "projectscale",
  "daily", "weekly", "monthly", "quarterly", "yearly", "zoom", "day", "days",
  "week", "weeks", "complete", "displays", "same", "row", "pauses", "project",
  "labels", "last", "first", "column",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "today"
]);

const plantumlColors = new Set([
  "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige",
  "bisque", "black", "blanchedalmond", "blue", "blueviolet", "brown",
  "burlywood", "cadetblue", "chartreuse", "chocolate", "coral",
  "cornflowerblue", "cornsilk", "crimson", "cyan", "darkblue", "darkcyan",
  "darkgoldenrod", "darkgray", "darkgreen", "darkgrey", "darkkhaki",
  "darkmagenta", "darkolivegreen", "darkorchid", "darkred", "darksalmon",
  "darkseagreen", "darkslateblue", "darkslategray", "darkslategrey",
  "darkturquoise", "darkviolet", "darkorange", "deeppink", "deepskyblue",
  "dimgray", "dimgrey", "dodgerblue", "firebrick", "floralwhite",
  "forestgreen", "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod",
  "gray", "green", "greenyellow", "grey", "honeydew", "hotpink", "indianred",
  "indigo", "ivory", "khaki", "lavender", "lavenderblush", "lawngreen",
  "lemonchiffon", "lightblue", "lightcoral", "lightcyan",
  "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey", "lightpink",
  "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray",
  "lightslategrey", "lightsteelblue", "lightyellow", "lime", "limegreen",
  "linen", "magenta", "maroon", "mediumaquamarine", "mediumblue",
  "mediumorchid", "mediumpurple", "mediumseagreen", "mediumspringgreen",
  "mediumturquoise", "mediumvioletred", "midnightblue", "mintcream",
  "mistyrose", "moccasin", "navajowhite", "navy", "oldlace", "olive",
  "olivedrab", "orange", "orangered", "orchid", "palegoldenrod", "palegreen",
  "paleturquoise", "palevioletred", "papayawhip", "peachpuff", "peru", "pink",
  "plum", "powderblue", "purple", "red", "rosybrown", "royalblue",
  "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", "sienna",
  "silver", "skyblue", "slategray", "slategrey", "snow", "springgreen",
  "steelblue", "tan", "teal", "thistle", "tomato", "turquoise", "violet",
  "wheat", "white", "whitesmoke", "yellow", "yellowgreen"
]);

const plantumlTokenizer = {
  startState() {
    return { inBlockComment: false, afterColon: false, lineStartKeyword: null };
  },
  token(stream, state) {
    if (state.afterColon || state.lineStartKeyword === 'startuml') {
      stream.skipToEnd();
      state.afterColon = false;
      state.lineStartKeyword = null;
      return null;
    }
    if (state.lineStartKeyword === 'title') {
      stream.skipToEnd();
      state.lineStartKeyword = null;
      return "labelName";
    }
    if (state.inBlockComment) {
      if (stream.match(/.*?'\//)) { state.inBlockComment = false; }
      else { stream.skipToEnd(); }
      return "comment";
    }
    if (stream.eatSpace()) return null;
    if (stream.match(/^\/'/)) {
      state.inBlockComment = true;
      if (stream.match(/.*?'\//)) { state.inBlockComment = false; }
      else { stream.skipToEnd(); }
      return "comment";
    }
    if (stream.match(/^'[^\n]*/)) return "comment";
    if (stream.match(/^@(start|end)[a-z]+\b/i)) {
      if (stream.current().toLowerCase().startsWith('@start')) {
        state.lineStartKeyword = 'startuml';
      }
      return "keyword";
    }
    if (stream.match(/^![a-zA-Z_0-9]+/)) return "meta";
    if (stream.match(/^"[^"]*"/)) return "string";
    if (stream.match(/^:/)) { state.afterColon = true; return null; }
    if (stream.match(/^#[0-9a-fA-F]{6}\b/i) || stream.match(/^#[0-9a-fA-F]{3}\b/i) || stream.match(/^#[0-9a-fA-F]{8}\b/i)) return "atom";
    if (stream.match(/^<[|<]?[-.~=]+[|>]?>/) || stream.match(/^[-.~=]+[|>]?>/) || stream.match(/^==+/) || stream.match(/^\.\.+/)) return "keyword";
    if (stream.match(/^\d+/)) return "number";
    const wordMatch = stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
    if (wordMatch) {
      const word = wordMatch[0].toLowerCase();
      if (plantumlKeywords.has(word)) {
        if (word === 'title') state.lineStartKeyword = 'title';
        return "keyword";
      }
      if (plantumlColors.has(word)) return "atom";
      return "atom";
    }
    stream.next();
    return null;
  }
};

const mermaidKeywords = new Set([
  "flowchart", "graph", "sequencediagram", "classdiagram", "statediagram",
  "statediagram-v2", "erdiagram", "journey", "gantt", "pie", "quadrantchart",
  "requirementdiagram", "gitgraph", "c4context", "c4container", "c4component",
  "c4dynamic", "c4deployment", "mindmap", "timeline", "zenuml", "block-beta",
  "packetbeta", "kanban", "architecture", "sankey", "sankeydiagram", "xychart",
  "block", "blockdiagram", "radar",
  "tb", "td", "bt", "rl", "lr",
  "alt", "par", "loop", "opt", "else", "end", "rect", "critical", "option",
  "break",
  "participant", "actor", "boundary", "control", "entity", "database",
  "collections", "queue", "as", "box", "create", "destroy", "autonumber",
  "activate", "deactivate", "note", "over", "of", "to", "link", "links",
  "click", "style", "classdef", "class", "subgraph", "title", "acctitle",
  "accdescr", "direction", "interpolate", "fill", "stroke", "stroke-width",
  "linkstyle", "theme", "left", "right", "and",
  "dateformat", "axisformat", "section", "completed", "active", "milestone",
  "crit",
  "commit", "branch", "checkout", "merge", "tag", "id", "type", "reverse"
]);

const mermaidTokenizer = {
  startState() {
    return { afterColon: false };
  },
  token(stream, state) {
    if (state.afterColon) {
      stream.skipToEnd();
      state.afterColon = false;
      return "string";
    }
    if (stream.eatSpace()) return null;
    if (stream.match(/^%%\{[\s\S]*?\}%%/)) return "meta";
    if (stream.match(/^%%[^\n]*/)) return "comment";
    if (stream.match(/^"[^"]*"/)) return "string";
    if (stream.match(/^:/)) { state.afterColon = true; return null; }
    if (stream.match(/^--?>?>/) || stream.match(/^--?[)x]/) || stream.match(/^-\.-?>?>/) || stream.match(/^==>/) || stream.match(/^--/)) return "keyword";
    if (stream.match(/^\|+[^|]+\|+/) || stream.match(/^\[[^\[\]]+\]/) || stream.match(/^<[^<>]+>/) || stream.match(/^\{[^{}]+\}/) || stream.match(/^\([^()]+\)/)) return "string";
    if (stream.match(/^\d+/)) return "number";
    const wordMatch = stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*(?:-[a-zA-Z0-9_]+)*/);
    if (wordMatch) {
      const fullWord = wordMatch[0].toLowerCase();
      if (mermaidKeywords.has(fullWord)) return "keyword";
      // Backtrack if hyphenated non-keyword (so arrow '-' isn't consumed)
      const baseOnly = wordMatch[0].match(/^[a-zA-Z_][a-zA-Z0-9_]*/)[0];
      if (baseOnly.length < wordMatch[0].length) {
        stream.pos = stream.start + baseOnly.length;
      }
      return null;
    }
    stream.next();
    return null;
  }
};

// ─────────────────────────────────────────────────────────
//  COMPARISON ENGINE
// ─────────────────────────────────────────────────────────

/**
 * Normalize tokens for comparison.
 * Merges consecutive tokens with same colorKey and trims whitespace-only tokens.
 */
function normalizeTokens(lineTokens) {
  const merged = [];
  for (const tok of lineTokens) {
    if (!tok.text.trim()) continue; // skip whitespace
    if (merged.length > 0 && merged[merged.length - 1].colorKey === tok.colorKey) {
      merged[merged.length - 1].text += tok.text;
    } else {
      merged.push({ ...tok });
    }
  }
  return merged;
}

/**
 * Compare Shiki vs CodeMirror tokens line by line.
 * Returns array of mismatch descriptions.
 */
function compareTokenizations(shikiLines, cmLines, label) {
  const mismatches = [];
  const maxLines = Math.max(shikiLines.length, cmLines.length);

  for (let i = 0; i < maxLines; i++) {
    const shikiNorm = normalizeTokens(shikiLines[i] || []);
    const cmNorm = normalizeTokens(cmLines[i] || []);

    // Compare token by token
    const maxTokens = Math.max(shikiNorm.length, cmNorm.length);
    for (let j = 0; j < maxTokens; j++) {
      const st = shikiNorm[j];
      const ct = cmNorm[j];

      if (!st || !ct) {
        // One side has more tokens — structural mismatch
        const missing = !st ? 'Shiki' : 'CodeMirror';
        const present = st || ct;
        mismatches.push({
          line: i + 1,
          text: present.text,
          issue: `Token exists only in ${missing === 'Shiki' ? 'CodeMirror' : 'Shiki'}`,
          shiki: st ? st.colorKey : '(none)',
          cm: ct ? ct.colorKey : '(none)',
        });
        continue;
      }

      // Text might differ slightly (e.g. arrow rendering)
      // Focus on overlapping text segments for color comparison
      if (st.colorKey !== ct.colorKey) {
        mismatches.push({
          line: i + 1,
          shikiText: st.text,
          cmText: ct.text,
          shiki: st.colorKey,
          cm: ct.colorKey,
        });
      }
    }
  }

  return mismatches;
}

// ─────────────────────────────────────────────────────────
//  MAIN — Run the test bench
// ─────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  TOKEN PARITY TEST — Chartre (Shiki) vs Spectre (CM)');
  console.log('═══════════════════════════════════════════════════════\n');

  // Load grammars
  const plantumlGrammar = JSON.parse(
    fs.readFileSync(path.join(GRAMMAR_DIR, 'plantuml.tmLanguage.json'), 'utf8')
  );
  const mermaidGrammar = JSON.parse(
    fs.readFileSync(path.join(GRAMMAR_DIR, 'mermaid-sequenceDiagram.tmLanguage.json'), 'utf8')
  );

  // Create Shiki highlighter with CSS Variables Theme
  const testTheme = createCssVariablesTheme({
    name: 'test-theme',
    variablePrefix: '--syntax-',
    fontStyle: false
  });

  const highlighter = await createHighlighter({
    themes: [testTheme],
    langs: [
      { ...plantumlGrammar, name: 'plantuml', id: 'plantuml',
        scopeName: plantumlGrammar.scopeName || 'source.puml' },
      { ...mermaidGrammar, name: 'mermaid-seq', id: 'mermaid-seq',
        scopeName: mermaidGrammar.scopeName || 'source.mermaid.sequenceDiagram' },
    ]
  });

  let totalMismatches = 0;

  // ─── PlantUML ───
  console.log('┌─────────────────────────────────────────────────────');
  console.log('│ PlantUML Sequence Diagram');
  console.log('└─────────────────────────────────────────────────────');

  const shikiPuml = await tokenizeWithShiki(highlighter, PLANTUML_SAMPLE, 'plantuml');
  const cmPuml = tokenizeWithStreamLanguage(plantumlTokenizer, PLANTUML_SAMPLE);
  const pumlMismatches = compareTokenizations(shikiPuml, cmPuml, 'PlantUML');

  if (pumlMismatches.length === 0) {
    console.log('  ✅ All tokens match!\n');
  } else {
    console.log(`  ⚠️  ${pumlMismatches.length} mismatches found:\n`);
    for (const m of pumlMismatches) {
      const text = m.shikiText || m.cmText || m.text;
      const display = text.length > 30 ? text.slice(0, 30) + '…' : text;
      console.log(`  Line ${String(m.line).padStart(2)}: "${display}"`);
      console.log(`          Shiki=${m.shiki}  CodeMirror=${m.cm}`);
    }
    console.log('');
    totalMismatches += pumlMismatches.length;
  }

  // ─── Mermaid ───
  console.log('┌─────────────────────────────────────────────────────');
  console.log('│ Mermaid Sequence Diagram');
  console.log('└─────────────────────────────────────────────────────');

  const shikiMmd = await tokenizeWithShiki(highlighter, MERMAID_SAMPLE, 'mermaid-seq');
  const cmMmd = tokenizeWithStreamLanguage(mermaidTokenizer, MERMAID_SAMPLE);
  const mmdMismatches = compareTokenizations(shikiMmd, cmMmd, 'Mermaid');

  if (mmdMismatches.length === 0) {
    console.log('  ✅ All tokens match!\n');
  } else {
    console.log(`  ⚠️  ${mmdMismatches.length} mismatches found:\n`);
    for (const m of mmdMismatches) {
      const text = m.shikiText || m.cmText || m.text;
      const display = text.length > 30 ? text.slice(0, 30) + '…' : text;
      console.log(`  Line ${String(m.line).padStart(2)}: "${display}"`);
      console.log(`          Shiki=${m.shiki}  CodeMirror=${m.cm}`);
    }
    console.log('');
    totalMismatches += mmdMismatches.length;
  }

  // ─── Summary ───
  console.log('═══════════════════════════════════════════════════════');
  if (totalMismatches === 0) {
    console.log('  🎉 PASS — All tokens produce identical colors!');
  } else {
    console.log(`  ❌ FAIL — ${totalMismatches} total mismatches detected.`);
    console.log('  Review the tokenizer classification above and align.');
  }
  console.log('═══════════════════════════════════════════════════════\n');

  // ─── Token Dump (for manual inspection) ───
  console.log('─── PlantUML Token Dump (first 5 lines) ───');
  for (let i = 0; i < Math.min(5, shikiPuml.length); i++) {
    const shikiLine = normalizeTokens(shikiPuml[i]);
    const cmLine = normalizeTokens(cmPuml[i]);
    console.log(`\n  Line ${i + 1}:`);
    console.log(`    Shiki: ${shikiLine.map(t => `[${t.colorKey}:"${t.text}"]`).join(' ')}`);
    console.log(`    CM:    ${cmLine.map(t => `[${t.colorKey}:"${t.text}"]`).join(' ')}`);
  }

  console.log('\n─── Mermaid Token Dump (first 5 lines) ───');
  for (let i = 0; i < Math.min(5, shikiMmd.length); i++) {
    const shikiLine = normalizeTokens(shikiMmd[i]);
    const cmLine = normalizeTokens(cmMmd[i]);
    console.log(`\n  Line ${i + 1}:`);
    console.log(`    Shiki: ${shikiLine.map(t => `[${t.colorKey}:"${t.text}"]`).join(' ')}`);
    console.log(`    CM:    ${cmLine.map(t => `[${t.colorKey}:"${t.text}"]`).join(' ')}`);
  }

  process.exit(totalMismatches > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(2);
});
