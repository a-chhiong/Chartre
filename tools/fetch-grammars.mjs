import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve securely path into your public asset block
const PUBLIC_SYNTAX_DIR = path.resolve(__dirname, '../web-page/public/syntaxes');

// Upstream raw files from official GitHub CDNs
const PLANTUML_YAML_URL = 'https://raw.githubusercontent.com/qjebbs/vscode-plantuml/master/syntaxes/plantuml.yaml-tmLanguage';
const MERMAID_BASE_URL = 'https://raw.githubusercontent.com/mermaid-chart/vscode-mermaid-chart/master/syntaxes';

const MERMAID_DIAGRAMS = [
    'mermaid.tmLanguage.json', // Main router
    'mermaid-architecture.tmLanguage.json',
    'mermaid-block.tmLanguage.json',
    'mermaid-c4Diagram.tmLanguage.json',
    'mermaid-classDiagram.tmLanguage.json',
    'mermaid-erDiagram.tmLanguage.json',
    'mermaid-flowchart.tmLanguage.json',
    'mermaid-gantt.tmLanguage.json',
    'mermaid-gitGraph.tmLanguage.json',
    'mermaid-info.tmLanguage.json',
    'mermaid-journey.tmLanguage.json',
    'mermaid-kanban.tmLanguage.json',
    'mermaid-markdown.json',
    'mermaid-mindmap.tmLanguage.json',
    'mermaid-packet.tmLanguage.json',
    'mermaid-pie.tmLanguage.json',
    'mermaid-quadrantChart.tmLanguage.json',
    'mermaid-radar.tmLanguage.json',
    'mermaid-requirementDiagram.tmLanguage.json',
    'mermaid-sankeyDiagram.tmLanguage.json',
    'mermaid-sequenceDiagram.tmLanguage.json',
    'mermaid-stateDiagram.tmLanguage.json',
    'mermaid-timeline.tmLanguage.json',
    'mermaid-xychart.tmLanguage.json',
    'mermaid-zenuml.tmLanguage.json'
];

async function downloadJsonFile(url, filename) {
    const destPath = path.join(PUBLIC_SYNTAX_DIR, filename);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
    const json = await response.json();
    fs.writeFileSync(destPath, JSON.stringify(json, null, 2), 'utf-8');
}

async function run() {
    console.log('⏳ Syncing TextMate grammars to public/syntaxes...');
    
    if (!fs.existsSync(PUBLIC_SYNTAX_DIR)) {
        fs.mkdirSync(PUBLIC_SYNTAX_DIR, { recursive: true });
    }

    // 1. Convert & Compile PlantUML
    try {
        console.log('📦 Processing PlantUML grammar syntax tree...');
        const pumlResponse = await fetch(PLANTUML_YAML_URL);
        if (!pumlResponse.ok) throw new Error(`HTTP ${pumlResponse.status}`);
        
        const yamlContent = await pumlResponse.text();
        const jsonObject = yaml.load(yamlContent);
        
        const pumlDest = path.join(PUBLIC_SYNTAX_DIR, 'plantuml.tmLanguage.json');
        fs.writeFileSync(pumlDest, JSON.stringify(jsonObject, null, 2), 'utf-8');
        console.log('✅ PlantUML grammar compiled.');
    } catch (err) {
        console.error('❌ PlantUML grammar parsing crash:', err.message);
        process.exit(1);
    }

    // 2. Download all Modular Mermaid Framework Fragments
    console.log('📦 Processing modular Mermaid syntax subgrammars...');
    for (const filename of MERMAID_DIAGRAMS) {
        try {
            await downloadJsonFile(`${MERMAID_BASE_URL}/${filename}`, filename);
            console.log(`  └─ ✅ Packaged asset: ${filename}`);
        } catch (err) {
            console.error(`❌ Mermaid download crash on [${filename}]:`, err.message);
            process.exit(1);
        }
    }

    console.log('\n🎉 Automation successfully built! Check your /web-page/public/syntaxes folder.');
}

run();