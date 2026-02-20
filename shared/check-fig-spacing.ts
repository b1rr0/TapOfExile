import { buildSkillTree, NODE_RADIUS } from './skill-tree';
const t = buildSkillTree();
const { nodes, figureMembership } = t;

// Measure keystone-to-keystone distances within figures
const figGroups = new Map<number, number[]>();
for (const [nodeId, figId] of figureMembership) {
  if (nodes[nodeId].type === 'keystone') {
    if (!figGroups.has(figId)) figGroups.set(figId, []);
    figGroups.get(figId)!.push(nodeId);
  }
}

let minDist = Infinity, avgDist = 0, count = 0;
for (const [figId, ksIds] of figGroups) {
  for (let i = 0; i < ksIds.length; i++) {
    for (let j = i + 1; j < ksIds.length; j++) {
      const a = nodes[ksIds[i]], b = nodes[ksIds[j]];
      if (!a.connections.includes(b.id)) continue; // only connected pairs
      const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
      avgDist += d; count++;
      if (d < minDist) minDist = d;
    }
  }
}
console.log(`Keystone-keystone (connected): min=${minDist.toFixed(1)} avg=${(avgDist/count).toFixed(1)} count=${count}`);

// Measure typical edge lengths by type
const edgeLengths: Record<string, number[]> = {};
for (const [aId, bId] of t.edges) {
  const a = nodes[aId], b = nodes[bId];
  const key = [a.type, b.type].sort().join('-');
  const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  if (!edgeLengths[key]) edgeLengths[key] = [];
  edgeLengths[key].push(d);
}
for (const [key, dists] of Object.entries(edgeLengths).sort()) {
  const min = Math.min(...dists);
  const avg = dists.reduce((s, v) => s + v, 0) / dists.length;
  const max = Math.max(...dists);
  console.log(`${key}: min=${min.toFixed(1)} avg=${avg.toFixed(1)} max=${max.toFixed(1)} n=${dists.length}`);
}

// NODE_RADIUS for reference
console.log('NODE_RADIUS:', NODE_RADIUS);
// keystone diameter = 32, so min comfortable dist ~40-50px
