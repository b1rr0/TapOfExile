import { buildSkillTree, NODE_RADIUS } from './skill-tree';
const tree = buildSkillTree();
const { nodes, edges, figureMembership } = tree;

// Counts
const counts: Record<string, number> = {};
for (const n of nodes) counts[n.type] = (counts[n.type] || 0) + 1;
console.log('Node counts:', counts, 'total:', nodes.length);
console.log('Edges:', edges.length);

// Emblem clearance
for (const em of tree.emblems) {
  let minDist = Infinity, closestNode = '';
  for (const n of nodes) {
    if (n.type === 'start' || n.type === 'classSkill') continue;
    const nr = (NODE_RADIUS as any)[n.type] || 8;
    const dist = Math.sqrt((n.x - em.cx)**2 + (n.y - em.cy)**2) - em.r - nr;
    if (dist < minDist) { minDist = dist; closestNode = n.nodeId; }
  }
  console.log(`Emblem ${em.classId}: closest=${closestNode} gap=${minDist.toFixed(1)}px`);
}

// 4-cycles (skip same-figure)
let c4 = 0, c4fig = 0;
for (let a = 0; a < nodes.length; a++) {
  for (const b of nodes[a].connections) {
    if (b <= a) continue;
    for (const c of nodes[b].connections) {
      if (c === a) continue;
      for (const d of nodes[c].connections) {
        if (d === b || d === a || d <= a) continue;
        if (nodes[d].connections.includes(a)) {
          const fa = figureMembership.get(a), fb = figureMembership.get(b);
          const fc = figureMembership.get(c), fd = figureMembership.get(d);
          if (fa !== undefined && fa === fb && fa === fc && fa === fd) { c4fig++; }
          else c4++;
        }
      }
    }
  }
}
console.log(`4-cycles: ${c4} (+ ${c4fig} figure-internal, exempt)`);

// Minor→Notable BFS
let maxMN = 0; let worstMN = '';
for (const n of nodes) {
  if (n.type !== 'minor') continue;
  const vis = new Set<number>([n.id]);
  const q: [number, number][] = [[n.id, 0]];
  while (q.length) {
    const [cur, d] = q.shift()!;
    if (nodes[cur].type === 'notable' && d > 0) {
      if (d > maxMN) { maxMN = d; worstMN = `${n.nodeId}->${nodes[cur].nodeId}=${d}`; }
      break;
    }
    for (const nb of nodes[cur].connections) {
      if (!vis.has(nb)) { vis.add(nb); q.push([nb, d+1]); }
    }
  }
}
console.log('Max minor→notable:', maxMN, worstMN);

// Notable→FigureEntry BFS
let maxNFE = 0; let worstNFE = '';
for (const n of nodes) {
  if (n.type !== 'notable') continue;
  const vis = new Set<number>([n.id]);
  const q: [number, number][] = [[n.id, 0]];
  while (q.length) {
    const [cur, d] = q.shift()!;
    if (nodes[cur].type === 'figureEntry' && d > 0) {
      if (d > maxNFE) { maxNFE = d; worstNFE = `${n.nodeId}->${nodes[cur].nodeId}=${d}`; }
      break;
    }
    for (const nb of nodes[cur].connections) {
      if (!vis.has(nb)) { vis.add(nb); q.push([nb, d+1]); }
    }
  }
}
console.log('Max notable→figureEntry:', maxNFE, worstNFE);

// Figure stats - per-shape breakdown
const figureEntries = nodes.filter(n => n.type === 'figureEntry');
const figureStats: Record<string, number> = {};
for (const fe of figureEntries) {
  const ksCount = fe.connections.filter(c => nodes[c].type === 'keystone').length;
  const key = `${ksCount}ks`;
  figureStats[key] = (figureStats[key] || 0) + 1;
}
console.log('Figure stats:', figureStats, 'total figures:', figureEntries.length);

// Figure edges
const figEdgeCount = tree.figureEdgeSet.size;
const totalFigMembers = figureMembership.size;
console.log(`Figure edges: ${figEdgeCount}, Figure members: ${totalFigMembers}`);

// Outer leaves
const outerLeaves = nodes.filter(n => n.type !== 'start' && n.type !== 'classSkill' && n.connections.length === 1);
console.log('Outer leaves:', outerLeaves.length, 'types:', outerLeaves.map(l => l.type).reduce((acc: Record<string,number>, t) => { acc[t]=(acc[t]||0)+1; return acc; }, {}));
