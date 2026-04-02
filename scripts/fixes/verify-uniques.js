const fs = require('fs');
const c = fs.readFileSync('shared/skill-tree-data.ts', 'utf8');
const lines = c.split('\n');
const nl = lines.find(l => l.includes('TREE_NODES'));
const nodes = JSON.parse(nl.match(/= (\[.*)/)[1].replace(/;$/, ''));

const UNIQ = new Set(['thorns','lifeSteal','multiStrike','luckyHits','execute','armorDouble',
  'shieldBash','firstStrike','critHeal','regenBoost','fireFromLightning','coldFromFire',
  'lightningFromCold','allElemental','penetration','bossSlayer','secondWind','overkill',
  'critExplosion','dodgeCounter','glancingBlows','cullingStrike','berserkerFury','dualWield2H']);

const uniqNodes = nodes.filter(n => n.mods && n.mods.some(m => UNIQ.has(m.stat)));
console.log('Total unique mechanic nodes: ' + uniqNodes.length);

const goldNodes = nodes.filter(n => n.mods && n.mods.some(m => m.stat === 'goldFind' || m.stat === 'xpGain'));
console.log('Gold/XP nodes: ' + goldNodes.length);

const hpOver = nodes.filter(n => n.mods && n.mods.some(m => m.stat === 'hp' && m.value > 0.15));
console.log('HP > 15%: ' + hpOver.length);

const statsUsed = new Set();
for (const n of uniqNodes) for (const m of n.mods) if (UNIQ.has(m.stat)) statsUsed.add(m.stat);
console.log('\nUnique stats in use (' + statsUsed.size + '): ' + [...statsUsed].sort().join(', '));
const unused = [...UNIQ].filter(s => !statsUsed.has(s));
console.log('Unused unique stats: ' + (unused.length ? unused.join(', ') : 'none'));
