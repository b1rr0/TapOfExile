const fs = require('fs');
const c = fs.readFileSync('shared/skill-tree-data.ts', 'utf8');
const lines = c.split('\n');
const nl = lines.find(l => l.includes('TREE_NODES'));
const nodes = JSON.parse(nl.match(/= (\[.*)/)[1].replace(/;$/, ''));
const ml = lines.find(l => l.includes('TREE_FIGURE_MEMBERSHIP'));
const mem = JSON.parse(ml.match(/= (\[.*)/)[1].replace(/;$/, ''));
const figMap = new Map(mem);

const SL = {
  damage: 'Damage', critChance: 'Crit Chance', critMulti: 'Crit Dmg',
  hp: 'HP', fireDmg: 'Fire', lightningDmg: 'Lightning', coldDmg: 'Cold',
  dodge: 'Dodge', dps: 'DPS',
};

function rebuildLabel(mods) {
  return mods.map(m => {
    if (m.mode === 'flat') return '+' + m.value + ' ' + (SL[m.stat] || m.stat);
    return '+' + Math.round(m.value * 100) + '% ' + (SL[m.stat] || m.stat);
  }).join(', ');
}

// Fix HP > 15%
let hpFixed = 0;
for (const n of nodes) {
  if (!n.mods) continue;
  let ch = false;
  for (const m of n.mods) {
    if (m.stat === 'hp' && m.mode === 'percent' && m.value > 0.15) {
      m.value = 0.15;
      ch = true;
    }
  }
  if (ch) {
    n.label = rebuildLabel(n.mods);
    if (n.stat === 'hp') n.value = 0.15;
    hpFixed++;
  }
}
console.log('HP capped: ' + hpFixed);

// Fix violations: replace critChance with critMulti in magic-dominant figures
const MAGIC = new Set(['fireDmg', 'coldDmg', 'lightningDmg']);
const figNodes = new Map();
for (const n of nodes) {
  const f = figMap.get(n.id);
  if (f === undefined) continue;
  if (!figNodes.has(f)) figNodes.set(f, []);
  figNodes.get(f).push(n);
}

let vFixed = 0;
for (const [fig, fnodes] of figNodes) {
  const allStats = new Set();
  for (const n of fnodes) {
    for (const m of (n.mods || [])) allStats.add(m.stat);
  }
  if (!allStats.has('critChance') || ![...allStats].some(s => MAGIC.has(s))) continue;

  // Count
  const magicNodes = fnodes.filter(n => n.mods && n.mods.some(m => MAGIC.has(m.stat)));
  const critNodes = fnodes.filter(n => n.mods && n.mods.some(m => m.stat === 'critChance') && !n.mods.some(m => MAGIC.has(m.stat)));

  if (magicNodes.length >= critNodes.length) {
    // Majority is magic, fix crit nodes -> critMulti
    for (const n of fnodes) {
      if (n.type === 'start' || n.type === 'activeSkill' || n.type === 'classSkill') continue;
      if (!n.mods) continue;
      const hasCrit = n.mods.some(m => m.stat === 'critChance');
      if (!hasCrit) continue;
      for (const m of n.mods) {
        if (m.stat === 'critChance') {
          m.stat = 'critMulti';
          m.value = Math.round(m.value * 1.6 * 1000) / 1000;
        }
      }
      n.stat = n.mods[0].stat;
      n.value = n.mods[0].value;
      n.label = rebuildLabel(n.mods);
      vFixed++;
    }
  } else {
    // Majority is crit, fix magic nodes -> damage
    for (const n of fnodes) {
      if (n.type === 'start' || n.type === 'activeSkill' || n.type === 'classSkill') continue;
      if (!n.mods) continue;
      const hasMagic = n.mods.some(m => MAGIC.has(m.stat));
      if (!hasMagic) continue;
      for (const m of n.mods) {
        if (MAGIC.has(m.stat)) {
          m.stat = 'damage';
          m.value = Math.round(m.value * 0.6 * 1000) / 1000;
        }
      }
      n.stat = n.mods[0].stat;
      n.value = n.mods[0].value;
      n.label = rebuildLabel(n.mods);
      vFixed++;
    }
  }
}
console.log('Violations fixed: ' + vFixed);

// Final check
let v2 = 0;
for (const [fig, fnodes] of figNodes) {
  const s = new Set();
  for (const n of fnodes) for (const m of (n.mods || [])) s.add(m.stat);
  if (s.has('critChance') && [...s].some(x => MAGIC.has(x))) {
    console.log('  Still violating: figure ' + fig);
    v2++;
  }
}
const hp2 = nodes.filter(n => n.mods && n.mods.some(m => m.stat === 'hp' && m.value > 0.15)).length;
console.log('Remaining violations: ' + v2 + ', HP>15%: ' + hp2);

// Write
const ser = JSON.stringify(nodes);
const newNl = nl.replace(/= \[.*/, '= ' + ser + ';');
const ul = lines.map(l => l === nl ? newNl : l);
fs.writeFileSync('shared/skill-tree-data.ts', ul.join('\n'), 'utf8');
console.log('Done');
