import { buildSkillTree, NODE_RADIUS } from './skill-tree';

const tree = buildSkillTree();
const { nodes, edges, figureMembership } = tree;

// Build ID → node map (IDs may have gaps after patching)
const nodeMap = new Map<number, typeof nodes[0]>();
for (const n of nodes) nodeMap.set(n.id, n);

// ── 1. ALL pairs < 20px ──
console.log('=== PAIRS CLOSER THAN 20px ===');
const closePairs: { a: number; b: number; dist: number }[] = [];
for (let i = 0; i < nodes.length; i++) {
  for (let j = i + 1; j < nodes.length; j++) {
    const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 20) {
      closePairs.push({ a: nodes[i].id, b: nodes[j].id, dist });
    }
  }
}
closePairs.sort((a, b) => a.dist - b.dist);
for (const p of closePairs) {
  const na = nodeMap.get(p.a)!, nb = nodeMap.get(p.b)!;
  const fa = figureMembership.get(na.id), fb = figureMembership.get(nb.id);
  const sameFig = fa !== undefined && fa === fb;
  console.log(`  ${p.dist.toFixed(1)}px: id=${p.a} "${na.nodeId}" (${na.type}) ↔ id=${p.b} "${nb.nodeId}" (${nb.type})${sameFig ? ' [same-fig]' : ''}`);
}
if (closePairs.length === 0) console.log('  None!');

// ── 2. Pairs < 10px ──
console.log('\n=== PAIRS CLOSER THAN 10px ===');
const veryClose = closePairs.filter(p => p.dist < 10);
if (veryClose.length === 0) console.log('  None!');
for (const p of veryClose) {
  console.log(`  ${p.dist.toFixed(1)}px: id=${p.a} "${nodeMap.get(p.a)!.nodeId}" ↔ id=${p.b} "${nodeMap.get(p.b)!.nodeId}"`);
}

// ── 3. Small angles (<30°) between edges ──
console.log('\n=== ANGLES < 30° BETWEEN EDGES ===');
let smallAngleCount = 0;
for (const n of nodes) {
  const conns = n.connections;
  if (conns.length < 2) continue;
  if (n.type === 'keystone') continue;

  for (let a = 0; a < conns.length; a++) {
    for (let b = a + 1; b < conns.length; b++) {
      const na = nodeMap.get(conns[a]), nb = nodeMap.get(conns[b]);
      if (!na || !nb) continue;
      const angA = Math.atan2(na.y - n.y, na.x - n.x);
      const angB = Math.atan2(nb.y - n.y, nb.x - n.x);
      let diff = Math.abs(angA - angB);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      const degDiff = diff * 180 / Math.PI;
      if (degDiff < 30) {
        smallAngleCount++;
        console.log(`  ${degDiff.toFixed(1)}°: id=${n.id} "${n.nodeId}" (${n.type}) edges→ id=${conns[a]} "${na.nodeId}" & id=${conns[b]} "${nb.nodeId}"`);
      }
    }
  }
}
if (smallAngleCount === 0) console.log('  None!');
console.log(`Total small angles: ${smallAngleCount}`);

// ── 4. Visual overlaps (dist < sum of radii + 2px) ──
console.log('\n=== VISUAL OVERLAPS (dist < sum of radii + 2) ===');
let overlapCount = 0;
for (let i = 0; i < nodes.length; i++) {
  for (let j = i + 1; j < nodes.length; j++) {
    const fi = figureMembership.get(nodes[i].id), fj = figureMembership.get(nodes[j].id);
    if (fi !== undefined && fi === fj) continue;
    const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const rI = NODE_RADIUS[nodes[i].type] || 8;
    const rJ = NODE_RADIUS[nodes[j].type] || 8;
    const minD = rI + rJ + 2;
    if (dist < minD) {
      overlapCount++;
      console.log(`  ${dist.toFixed(1)}px (min=${minD}): id=${nodes[i].id} "${nodes[i].nodeId}" (r=${rI}) ↔ id=${nodes[j].id} "${nodes[j].nodeId}" (r=${rJ})`);
    }
  }
}
if (overlapCount === 0) console.log('  None!');
console.log(`Total visual overlaps: ${overlapCount}`);

// ── 5. Edge crossings ──
console.log('\n=== EDGE CROSSINGS ===');
function segsCross(x1:number,y1:number,x2:number,y2:number,x3:number,y3:number,x4:number,y4:number):boolean {
  const d=(x2-x1)*(y4-y3)-(y2-y1)*(x4-x3);
  if(Math.abs(d)<1e-10)return false;
  const t=((x3-x1)*(y4-y3)-(y3-y1)*(x4-x3))/d;
  const u=((x3-x1)*(y2-y1)-(y3-y1)*(x2-x1))/d;
  return t>0.01&&t<0.99&&u>0.01&&u<0.99;
}
let crossCount = 0;
for (let i = 0; i < edges.length; i++) {
  const [a1,b1] = edges[i];
  const na1 = nodeMap.get(a1), nb1 = nodeMap.get(b1);
  if (!na1 || !nb1) continue;
  for (let j = i+1; j < edges.length; j++) {
    const [a2,b2] = edges[j];
    if (a1===a2||a1===b2||b1===a2||b1===b2) continue;
    const na2 = nodeMap.get(a2), nb2 = nodeMap.get(b2);
    if (!na2 || !nb2) continue;
    if (segsCross(na1.x,na1.y,nb1.x,nb1.y,na2.x,na2.y,nb2.x,nb2.y)) {
      crossCount++;
      if (crossCount <= 10) console.log(`  Crossing: [${a1},${b1}] × [${a2},${b2}]`);
    }
  }
}
console.log(`Total edge crossings: ${crossCount}`);

// ── 6. BFS connectivity ──
console.log('\n=== BFS CONNECTIVITY ===');
const adj = new Map<number, number[]>();
for (const n of nodes) adj.set(n.id, []);
for (const [a, b] of edges) {
  adj.get(a)?.push(b);
  adj.get(b)?.push(a);
}
const visited = new Set<number>();
const q = [nodes[0].id];
visited.add(nodes[0].id);
while (q.length) {
  const cur = q.shift()!;
  for (const nb of adj.get(cur) || []) {
    if (!visited.has(nb)) { visited.add(nb); q.push(nb); }
  }
}
console.log(`BFS: ${visited.size}/${nodes.length} reachable`);
if (visited.size !== nodes.length) {
  const unreachable = nodes.filter(n => !visited.has(n.id)).map(n => `${n.id}(${n.nodeId})`);
  console.log(`  Unreachable: ${unreachable.join(', ')}`);
}

// ── Summary ──
console.log('\n=== SUMMARY ===');
console.log(`  Nodes: ${nodes.length}`);
console.log(`  Edges: ${edges.length}`);
console.log(`  Pairs < 10px: ${veryClose.length}`);
console.log(`  Pairs < 20px: ${closePairs.length}`);
console.log(`  Visual overlaps: ${overlapCount}`);
console.log(`  Small angles (<30°): ${smallAngleCount}`);
console.log(`  Edge crossings: ${crossCount}`);
console.log(`  BFS: ${visited.size}/${nodes.length}`);
