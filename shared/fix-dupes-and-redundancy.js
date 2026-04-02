const fs = require('fs');
const content = fs.readFileSync('shared/skill-tree-data.ts', 'utf8');
const lines = content.split('\n');
const nodesLine = lines.find(l => l.includes('TREE_NODES'));
const nodes = JSON.parse(nodesLine.match(/= (\[.*)/)[1].replace(/;$/,''));
const memLine = lines.find(l => l.includes('TREE_FIGURE_MEMBERSHIP'));
const mem = JSON.parse(memLine.match(/= (\[.*)/)[1].replace(/;$/,''));
const figMap = new Map(mem);

const UNIQ = new Set(['thorns','lifeSteal','multiStrike','luckyHits','execute','armorDouble','shieldBash','firstStrike','critHeal','regenBoost','fireFromLightning','coldFromFire','lightningFromCold','allElemental','penetration','bossSlayer','secondWind','overkill','critExplosion','dodgeCounter']);

// ═══════════════════════════════════════════
// FIX 1: Deduplicate unique mechanics per class
// ═══════════════════════════════════════════
const REPLACEMENTS = [
  // samurai: 2nd lifeSteal -> multiStrike
  { id: 523, stat: 'multiStrike', value: 0.12, name: 'Blade Dance', label: '12% chance to strike twice', mode: 'flat' },
  // mage: 2nd fireFromLightning -> coldFromFire
  { id: 521, stat: 'coldFromFire', value: 1.0, name: 'Frozen Pyre', label: 'Cold bonus equals Fire bonus', mode: 'flat' },
  // archer: 2nd luckyHits -> dodgeCounter
  { id: 522, stat: 'dodgeCounter', value: 0.50, name: 'Riposte', label: 'On dodge, deal 50% damage back', mode: 'flat' },
  // archer: 2nd critHeal -> overkill
  { id: 530, stat: 'overkill', value: 1.0, name: 'Through and Through', label: 'Excess kill damage hits next enemy', mode: 'flat' },
];

let fixedUniq = 0;
for (const p of REPLACEMENTS) {
  const n = nodes[p.id];
  n.mods = [{ stat: p.stat, value: p.value, mode: p.mode }];
  n.stat = p.stat;
  n.value = p.value;
  n.name = p.name;
  n.label = p.label;
  fixedUniq++;
}
console.log('Fixed ' + fixedUniq + ' duplicate uniques');

// ═══════════════════════════════════════════
// FIX 2: Fix damage+dps redundancy
// ═══════════════════════════════════════════
const STAT_MAP = { damage: 'tapDamage', dps: 'tapDamage' };
const DPS_REPLACE = {
  samurai: { stat: 'critChance', base: 0.05 },
  warrior: { stat: 'hp', base: 0.10 },
  mage: { stat: 'fireDmg', base: 0.05 },
  archer: { stat: 'critMulti', base: 0.08 },
  undefined: { stat: 'critChance', base: 0.05 },
  '': { stat: 'critChance', base: 0.05 },
};
const STAT_LABEL = {
  damage: 'Damage', dps: 'DPS', critChance: 'Crit Chance', critMulti: 'Crit Dmg',
  hp: 'HP', fireDmg: 'Fire', lightningDmg: 'Lightning', coldDmg: 'Cold', dodge: 'Dodge',
};

let fixedRedundant = 0;
for (const n of nodes) {
  if (!n.mods || n.mods.length < 2) continue;
  const mapped = n.mods.map(m => STAT_MAP[m.stat] || m.stat);
  const hasDuplicate = mapped.filter((v,i) => mapped.indexOf(v) !== i).length > 0;
  if (!hasDuplicate) continue;

  const hasDamage = n.mods.some(m => m.stat === 'damage');
  const hasDps = n.mods.some(m => m.stat === 'dps');

  if (hasDamage && hasDps) {
    const cls = n.classAffinity || '';
    const repl = DPS_REPLACE[cls] || DPS_REPLACE[''];
    const dpsIdx = n.mods.findIndex(m => m.stat === 'dps');
    if (dpsIdx >= 0) {
      const oldValue = n.mods[dpsIdx].value;
      const newValue = Math.round((oldValue / 0.03) * repl.base * 1000) / 1000;
      n.mods[dpsIdx] = { stat: repl.stat, value: newValue, mode: 'percent' };
    }
  }

  const labelParts = n.mods.map(m => {
    const pct = Math.round(m.value * 100);
    const label = STAT_LABEL[m.stat] || m.stat;
    return '+' + pct + '% ' + label;
  });
  n.label = labelParts.join(', ');
  n.stat = n.mods[0].stat;
  n.value = n.mods[0].value;
  fixedRedundant++;
}
console.log('Fixed ' + fixedRedundant + ' redundant damage+dps nodes');

// ═══════════════════════════════════════════
// VERIFY
// ═══════════════════════════════════════════
console.log('\n=== VERIFICATION ===');

// Duplicate uniques per class
const byClass = {};
for (const n of nodes) {
  if (!n.mods || !n.mods.some(m => UNIQ.has(m.stat))) continue;
  const cls = n.classAffinity || 'neutral';
  if (!byClass[cls]) byClass[cls] = [];
  byClass[cls].push({ id: n.id, stat: n.mods[0].stat, name: n.name });
}
let dupCount = 0;
for (const [cls, arr] of Object.entries(byClass)) {
  const seen = new Set();
  for (const item of arr) {
    if (seen.has(item.stat)) {
      console.log('  STILL DUPLICATE: ' + cls + ' "' + item.stat + '" #' + item.id);
      dupCount++;
    }
    seen.add(item.stat);
  }
}
if (dupCount === 0) console.log('  No duplicate uniques per class OK');

// Redundant stats
let redCount = 0;
for (const n of nodes) {
  if (!n.mods || n.mods.length < 2) continue;
  const mapped = n.mods.map(m => STAT_MAP[m.stat] || m.stat);
  if (mapped.filter((v,i) => mapped.indexOf(v) !== i).length > 0) {
    console.log('  STILL REDUNDANT: #' + n.id + ' ' + n.mods.map(m=>m.stat).join('+'));
    redCount++;
  }
}
if (redCount === 0) console.log('  No redundant stats in same node OK');

// Unique layout per class
for (const [cls, arr] of Object.entries(byClass)) {
  console.log('\n  ' + cls + ':');
  for (const item of arr) console.log('    #' + item.id + ' ' + item.stat + ' "' + item.name + '"');
}

// Violations
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
  if (stats.has('critChance') && [...stats].some(s => MAGIC.has(s))) violations++;
}
console.log('\n  Violations (crit+magic): ' + violations);
const goldNodes = nodes.filter(n => n.mods && n.mods.some(m => m.stat === 'goldFind' || m.stat === 'xpGain'));
console.log('  Gold/XP nodes: ' + goldNodes.length);
const hpOver = nodes.filter(n => n.mods && n.mods.some(m => m.stat === 'hp' && m.value > 0.15));
console.log('  HP > 15%: ' + hpOver.length);

// Write
const serialized = JSON.stringify(nodes);
const newNodesLine = nodesLine.replace(/= \[.*/, '= ' + serialized + ';');
const updatedLines = lines.map(l => l === nodesLine ? newNodesLine : l);
fs.writeFileSync('shared/skill-tree-data.ts', updatedLines.join('\n'), 'utf8');
console.log('\nWrote updated skill-tree-data.ts');
