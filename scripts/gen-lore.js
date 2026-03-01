const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'shared', 'public', 'assets', 'equipments');

const catalogs = [];
function findMd(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.isDirectory()) findMd(path.join(dir, f.name));
    else if (f.name.endsWith('_catalog.md')) catalogs.push(path.join(dir, f.name));
  }
}
findMd(baseDir);

const lore = {};
let total = 0;
for (const file of catalogs) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (const line of lines) {
    // Parse table rows: | N | ![...](./filename.png) | **Name** | Visual | *Lore* | Classes |
    const m = line.match(/^\|\s*\d+\s*\|.*?\|\s*\*\*(.+?)\*\*\s*\|.*?\|\s*\*(.+?)\*\s*\|/);
    if (!m) continue;
    const name = m[1].trim();
    const desc = m[2].trim();
    const key = name.replace(/ /g, '_');
    lore[key] = desc;
    total++;
  }
}

console.log('Total items:', total);
console.log('Sample:', Object.keys(lore).slice(0, 3));
const json = JSON.stringify(lore);
console.log('JSON size:', (json.length / 1024).toFixed(1), 'KB');

// Generate TypeScript file
const outPath = path.join(__dirname, '..', 'shared', 'equipment-lore.ts');
let ts = '/** Auto-generated from *_catalog.md files. Do NOT edit manually. */\n';
ts += 'export const EQUIPMENT_LORE: Record<string, string> = {\n';
const keys = Object.keys(lore).sort();
for (const k of keys) {
  const escaped = lore[k].replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ');
  ts += `  '${k.replace(/'/g, "\\'")}': '${escaped}',\n`;
}
ts += '};\n\n';
ts += `/** Lookup lore by PNG filename (without extension and path). */\n`;
ts += `export function getLore(iconPath: string): string | undefined {\n`;
ts += `  const filename = iconPath.split('/').pop()?.replace(/\\.png$/, '') ?? '';\n`;
ts += `  return EQUIPMENT_LORE[filename];\n`;
ts += `}\n`;

fs.writeFileSync(outPath, ts, 'utf8');
console.log('Written:', outPath, '(' + (ts.length / 1024).toFixed(1) + ' KB)');
