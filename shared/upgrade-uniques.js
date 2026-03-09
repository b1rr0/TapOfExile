const fs = require('fs');
const content = fs.readFileSync('shared/skill-tree-data.ts', 'utf8');
const lines = content.split('\n');
const nodesLine = lines.find(l => l.includes('TREE_NODES'));
const nodes = JSON.parse(nodesLine.match(/= (\[.*)/)[1].replace(/;$/,''));

// ═══════════════════════════════════════════════════════
// Replace 10 duplicate cross-class notables with new/unused unique mechanics
// ═══════════════════════════════════════════════════════

const REPLACEMENTS = [
  // ── Samurai: replace lifeSteal & regenBoost with firstStrike & critExplosion ──
  {
    id: 446, stat: 'firstStrike', value: 1.0, mode: 'flat',
    name: 'The First Cut', label: 'First hit per monster deals 2× damage',
  },
  {
    id: 519, stat: 'critExplosion', value: 0.3, mode: 'flat',
    name: 'Blade Storm', label: 'Crits deal 30% as burst damage',
  },

  // ── Warrior: replace lifeSteal, critHeal, regenBoost with armorDouble, shieldBash, glancingBlows ──
  {
    id: 452, stat: 'armorDouble', value: 2, mode: 'flat',
    name: 'Iron Fortress', label: 'Armor effectiveness ×2',
  },
  {
    id: 524, stat: 'shieldBash', value: 0.4, mode: 'flat',
    name: 'Shield Counter', label: 'Block deals 40% tap damage back',
  },
  {
    id: 451, stat: 'glancingBlows', value: 1, mode: 'flat',
    name: 'Glancing Blows', label: '2× block chance, blocks prevent 50%',
  },

  // ── Mage: replace regenBoost, bossSlayer with allElemental, lightningFromCold ──
  {
    id: 525, stat: 'allElemental', value: 1, mode: 'flat',
    name: 'Elemental Harmony', label: 'All elements equal highest',
  },
  {
    id: 457, stat: 'lightningFromCold', value: 1, mode: 'flat',
    name: 'Storm Weaver', label: 'Lightning bonus equals Cold bonus',
  },

  // ── Archer: replace execute, critHeal, lifeSteal with dualWield2H, berserkerFury, cullingStrike ──
  {
    id: 461, stat: 'dualWield2H', value: 1, mode: 'flat',
    name: "Titan's Grip", label: 'Can equip two-handed in off-hand',
  },
  {
    id: 462, stat: 'berserkerFury', value: 1, mode: 'flat',
    name: "Berserker's Fury", label: '+1% damage per 2% missing HP',
  },
  {
    id: 526, stat: 'cullingStrike', value: 0.1, mode: 'flat',
    name: 'Culling Strike', label: 'Enemies below 10% HP die instantly',
  },
];

let fixed = 0;
for (const r of REPLACEMENTS) {
  const n = nodes[r.id];
  if (!n) { console.log('ERROR: node ' + r.id + ' not found'); continue; }
  const oldStat = n.mods?.[0]?.stat || n.stat;
  n.mods = [{ stat: r.stat, value: r.value, mode: r.mode }];
  n.stat = r.stat;
  n.value = r.value;
  n.name = r.name;
  n.label = r.label;
  n.defId = null; // Force raw data usage (bypass hydration pool)
  console.log('  #' + r.id + ' ' + oldStat + ' → ' + r.stat + ' "' + r.name + '"');
  fixed++;
}
console.log('\nReplaced ' + fixed + ' nodes');

// ═══════════════════════════════════════════════════════
// VERIFY: no duplicate uniques within same class
// ═══════════════════════════════════════════════════════
const UNIQ = new Set([
  'thorns','lifeSteal','multiStrike','luckyHits','execute','armorDouble',
  'shieldBash','firstStrike','critHeal','regenBoost','fireFromLightning',
  'coldFromFire','lightningFromCold','allElemental','penetration','bossSlayer',
  'secondWind','overkill','critExplosion','dodgeCounter',
  'glancingBlows','cullingStrike','berserkerFury','dualWield2H',
]);

const byClass = {};
for (const n of nodes) {
  if (!n.mods || !n.mods.some(m => UNIQ.has(m.stat))) continue;
  const cls = n.classAffinity || 'neutral';
  if (!byClass[cls]) byClass[cls] = [];
  byClass[cls].push({ id: n.id, stat: n.mods[0].stat, name: n.name });
}

console.log('\n=== UNIQUE MECHANICS PER CLASS ===');
let dupCount = 0;
for (const [cls, arr] of Object.entries(byClass)) {
  console.log('\n  ' + cls + ':');
  const seen = new Set();
  for (const item of arr) {
    const dup = seen.has(item.stat) ? ' *** DUPLICATE ***' : '';
    if (dup) dupCount++;
    console.log('    #' + item.id + ' ' + item.stat + ' "' + item.name + '"' + dup);
    seen.add(item.stat);
  }
}
console.log('\nDuplicate uniques: ' + dupCount);

// Check violations (crit+magic in same figure)
const memLine = lines.find(l => l.includes('TREE_FIGURE_MEMBERSHIP'));
const mem = JSON.parse(memLine.match(/= (\[.*)/)[1].replace(/;$/,''));
const figMap = new Map(mem);
const MAGIC = new Set(['fireDmg','coldDmg','lightningDmg']);
const figNodes = new Map();
for (const n of nodes) {
  const fig = figMap.get(n.id);
  if (fig === undefined) continue;
  if (!figNodes.has(fig)) figNodes.set(fig, []);
  figNodes.get(fig).push(n);
}
let violations = 0;
for (const [fig, fnodes] of figNodes) {
  const stats = new Set();
  for (const n of fnodes) for (const m of (n.mods || [])) stats.add(m.stat);
  if (stats.has('critChance') && [...stats].some(s => MAGIC.has(s))) {
    console.log('  VIOLATION: figure ' + fig);
    violations++;
  }
}
console.log('Violations: ' + violations);

const hpOver = nodes.filter(n => n.mods && n.mods.some(m => m.stat === 'hp' && m.value > 0.15));
console.log('HP > 15%: ' + hpOver.length);

// Write
const serialized = JSON.stringify(nodes);
const newNodesLine = nodesLine.replace(/= \[.*/, '= ' + serialized + ';');
const updatedLines = lines.map(l => l === nodesLine ? newNodesLine : l);
fs.writeFileSync('shared/skill-tree-data.ts', updatedLines.join('\n'), 'utf8');
console.log('\nWrote updated skill-tree-data.ts');
