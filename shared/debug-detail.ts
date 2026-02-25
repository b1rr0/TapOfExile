import { buildSkillTree, NODE_RADIUS } from './skill-tree';

const tree = buildSkillTree();
const { nodes, edges, figureMembership } = tree;

// Find the specific crossing pairs
const gwSam = nodes.find(n => n.nodeId === 'samurai-fig-tendril-s0-d1-gate')!;
const gwWar = nodes.find(n => n.nodeId === 'warrior-fig-tendril-s0-d1-gate')!;

for (const gw of [gwSam, gwWar]) {
  if (!gw) continue;
  console.log(`\n=== ${gw.nodeId} at (${gw.x.toFixed(1)}, ${gw.y.toFixed(1)}) ===`);
  const ksNodes = gw.connections.filter(c => nodes[c].type === 'keystone').map(c => nodes[c]);
  for (const ks of ksNodes) {
    const dist = Math.sqrt((ks.x-gw.x)**2 + (ks.y-gw.y)**2);
    const kwId = ks.nodeId.replace('samurai-','').replace('warrior-','');
    console.log(`  ${kwId}: (${ks.x.toFixed(1)}, ${ks.y.toFixed(1)}) dist=${dist.toFixed(1)}`);
  }
  const figId = figureMembership.get(gw.id);
  console.log(`  figId=${figId}`);

  // Show all ks-ks edges of this figure
  console.log(`  Figure ks-ks edges:`);
  for (const [a,b] of edges) {
    const fa = figureMembership.get(a), fb = figureMembership.get(b);
    if (fa === figId && fb === figId) {
      const na = nodes[a], nb = nodes[b];
      if (na.type === 'keystone' && nb.type === 'keystone') {
        const distA = Math.sqrt((na.x-gw.x)**2+(na.y-gw.y)**2);
        const distB = Math.sqrt((nb.x-gw.x)**2+(nb.y-gw.y)**2);
        console.log(`    ${na.nodeId.replace('samurai-fig-tendril-s0-d1-','').replace('warrior-fig-tendril-s0-d1-','')} (${na.x.toFixed(1)}, ${na.y.toFixed(1)}, d=${distA.toFixed(1)}) -- ${nb.nodeId.replace('samurai-fig-tendril-s0-d1-','').replace('warrior-fig-tendril-s0-d1-','')} (${nb.x.toFixed(1)}, ${nb.y.toFixed(1)}, d=${distB.toFixed(1)})`);
      }
    }
  }
}

// Check actual crossing geometry for case #1
const m0s0 = nodes.find(n => n.nodeId === 'samurai-tendril-m0-d2-s0')!;
const m0s1 = nodes.find(n => n.nodeId === 'samurai-tendril-m0-d2-s1')!;
if (m0s0 && m0s1 && gwSam) {
  console.log(`\nCrossing case #1 geometry:`);
  console.log(`m0-d2-s0: (${m0s0.x.toFixed(1)}, ${m0s0.y.toFixed(1)})`);
  console.log(`m0-d2-s1: (${m0s1.x.toFixed(1)}, ${m0s1.y.toFixed(1)})`);

  // Min distance from gateway to segment m0s0-m0s1
  const Ax = m0s0.x, Ay = m0s0.y, Bx = m0s1.x, By = m0s1.y;
  const Px = gwSam.x, Py = gwSam.y;
  const dx = Bx-Ax, dy = By-Ay;
  const len2 = dx*dx+dy*dy;
  const t = Math.max(0, Math.min(1, ((Px-Ax)*dx+(Py-Ay)*dy)/len2));
  const cx = Ax+t*dx, cy = Ay+t*dy;
  const minDist = Math.sqrt((Px-cx)**2+(Py-cy)**2);
  console.log(`Min dist from gateway to tree edge: ${minDist.toFixed(1)}`);
}
