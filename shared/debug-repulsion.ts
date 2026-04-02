import { buildSkillTree, INNER_SHAPES, OUTER_SHAPES, NODE_RADIUS } from './skill-tree';

const tree = buildSkillTree();
const { nodes, edges, figureMembership } = tree;

// Check: for each figure gateway, how close are the nearest non-figure nodes?
const figureEntries = nodes.filter(n => n.type === 'figureEntry');

// Approximate figR for each gateway
function getApproxFigR(gw: typeof nodes[0]): number {
  const figId = figureMembership.get(gw.id);
  if (figId === undefined) return 14;
  // Count keystones connected
  const ksCount = gw.connections.filter(c => nodes[c].type === 'keystone').length;
  // Guess scale
  const scale = ksCount >= 6 ? 18 : 16;
  // Find the actual shape by looking at keystone positions
  const ksNodes = gw.connections.filter(c => nodes[c].type === 'keystone').map(c => nodes[c]);
  if (ksNodes.length === 0) return 14;
  const maxDist = Math.max(...ksNodes.map(ks => Math.sqrt((ks.x - gw.x)**2 + (ks.y - gw.y)**2)));
  return maxDist + NODE_RADIUS['keystone'];
}

// Check specific problem cases
const problemCases = [
  { fig: 'samurai-fig-tendril-s0-d1-gate', branch: 'samurai-tendril-m0-d2-s0' },
  { fig: 'samurai-fig-tendril-s0-d1-gate', branch: 'samurai-tendril-m0-d2-s1' },
  { fig: 'samurai-fig-tendril-s1-d1-gate', branch: 'samurai-tendril-m2-d2-s1' },
  { fig: 'warrior-fig-tendril-s0-d1-gate', branch: 'warrior-tendril-m0-d2-s1' },
  { fig: 'warrior-fig-tendril-s0-d1-gate', branch: 'warrior-tendril-m0L-d1-s0' },
];

console.log('=== Distance from gateway to nearby branch nodes ===\n');

for (const { fig: figName, branch: branchName } of problemCases) {
  const gw = nodes.find(n => n.nodeId === figName);
  const br = nodes.find(n => n.nodeId === branchName);
  if (!gw || !br) { console.log(`NOT FOUND: ${figName} or ${branchName}`); continue; }
  const dist = Math.sqrt((br.x - gw.x)**2 + (br.y - gw.y)**2);
  const figR = getApproxFigR(gw);
  const inside = dist < figR;
  console.log(`${figName.replace('samurai-','').replace('warrior-','')}:`);
  console.log(`  gateway at (${gw.x.toFixed(1)}, ${gw.y.toFixed(1)})`);
  console.log(`  ${branchName.replace('samurai-','').replace('warrior-','')}: (${br.x.toFixed(1)}, ${br.y.toFixed(1)})`);
  console.log(`  dist=${dist.toFixed(1)}, figR≈${figR.toFixed(1)}, INSIDE=${inside}`);
  console.log();
}

// Also check all non-figure nodes vs all figure gateways for any nodes inside bounding radius
console.log('=== All nodes inside figure bounding radii ===\n');
let violCount = 0;
for (const gw of figureEntries) {
  const figR = getApproxFigR(gw);
  const figId = figureMembership.get(gw.id)!;
  for (const n of nodes) {
    if (n.type === 'keystone' || n.type === 'figureEntry') continue;
    if (figureMembership.has(n.id)) continue;
    const dist = Math.sqrt((n.x - gw.x)**2 + (n.y - gw.y)**2);
    if (dist < figR) {
      violCount++;
      if (violCount <= 20) {
        console.log(`  ${gw.nodeId} (figR=${figR.toFixed(0)}): ${n.nodeId} at dist=${dist.toFixed(1)}`);
      }
    }
  }
}
console.log(`\nTotal non-figure nodes inside figure bounding radii: ${violCount}`);
