const fs = require('fs');
const path = require('path');

const DIRECTORIES = [
  path.join(__dirname, '../web-page')
];

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'out', '.DS_Store', 'labs'];

const REPLACEMENTS = [
  { regex: /plantEditor/g, replacement: 'chartre' },
  { regex: /PlantEditor/g, replacement: 'Chartre' },
  { regex: /PLANTEDITOR/g, replacement: 'CHARTRE' },
  { regex: /plant-editor/g, replacement: 'chartre' },
  { regex: /Plant-Editor/g, replacement: 'Chartre' },
  { regex: /plant_editor/g, replacement: 'chartre' },
  { regex: /stave-editor/g, replacement: 'chartre' },
  { regex: /Stave-Editor/g, replacement: 'Chartre' },
  { regex: /stave_editor/g, replacement: 'chartre' },
  { regex: /staveEditor/g, replacement: 'chartre' },
  { regex: /StaveEditor/g, replacement: 'Chartre' }
];

let filesModified = 0;

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    
    if (IGNORE_DIRS.includes(file)) {
      continue;
    }
    
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let newContent = content;
    
    for (const { regex, replacement } of REPLACEMENTS) {
      newContent = newContent.replace(regex, replacement);
    }
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`Modified: ${filePath}`);
      filesModified++;
    }
  } catch (error) {
    // Ignore files that can't be read as utf-8 (e.g. binary files)
    if (error.code !== 'EISDIR' && !error.message.includes('EBUSY')) {
      // console.error(`Error processing ${filePath}:`, error.message);
    }
  }
}

console.log('Starting rebranding process...');
for (const dir of DIRECTORIES) {
  if (fs.existsSync(dir)) {
    console.log(`Scanning ${dir}...`);
    walkDir(dir);
  } else {
    console.warn(`Directory not found: ${dir}`);
  }
}
console.log(`\nRebranding complete. Modified ${filesModified} files.`);
