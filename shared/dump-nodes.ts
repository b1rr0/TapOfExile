import { buildSkillTree } from "./skill-tree";
const tree = buildSkillTree();
const ids = [177, 208, 270, 280, 359, 382, 503, 506, 510, 539];
for (const id of ids) {
  const n = tree.nodes[id];
  // find neighbors
  const neighbors = n.connections.map((c: number) => {
    const cn = tree.nodes[c];
    return `${cn.id}(${cn.nodeId})`;
  });
  console.log(`id=${n.id} nodeId=${n.nodeId} type=${n.type} class=${n.classAffinity} x=${n.x.toFixed(1)} y=${n.y.toFixed(1)}`);
  console.log(`  neighbors: ${neighbors.join(', ')}`);
}

// Also check nearby nodes for overlap analysis
console.log('\n--- Proximity check for overlaps ---');
const checkPairs: [number, number][] = [[382, 359], [503, 506]];
for (const [a, b] of checkPairs) {
  const na = tree.nodes[a], nb = tree.nodes[b];
  const dist = Math.sqrt((na.x - nb.x) ** 2 + (na.y - nb.y) ** 2);
  console.log(`${a}(${na.nodeId}) <-> ${b}(${nb.nodeId}): dist=${dist.toFixed(1)}px`);
}

// Check what 539 and 510 are covering
console.log('\n--- Nodes near 539 and 510 ---');
for (const targetId of [539, 510]) {
  const t = tree.nodes[targetId];
  const nearby: string[] = [];
  for (const n of tree.nodes) {
    if (n.id === targetId) continue;
    const dist = Math.sqrt((n.x - t.x) ** 2 + (n.y - t.y) ** 2);
    if (dist < 40) {
      nearby.push(`${n.id}(${n.nodeId},${n.type}) dist=${dist.toFixed(1)}`);
    }
  }
  console.log(`Near ${targetId}(${t.nodeId}): ${nearby.join(', ') || 'none'}`);
}

// Node 280 and its connected subtree
console.log('\n--- Node 280 subtree (connections) ---');
const n280 = tree.nodes[280];
const subtree = new Set<number>([280]);
const queue = [280];
// BFS only through figure edges (keystones connected to 280's figure)
const fig280 = tree.figureMembership.get(280);
if (fig280 !== undefined) {
  while (queue.length) {
    const cur = queue.shift()!;
    for (const nb of tree.nodes[cur].connections) {
      if (subtree.has(nb)) continue;
      const figNb = tree.figureMembership.get(nb);
      if (figNb === fig280) {
        subtree.add(nb);
        queue.push(nb);
      }
    }
  }
}
console.log(`280 figure=${fig280}, subtree: ${[...subtree].join(', ')}`);
for (const id of subtree) {
  const n = tree.nodes[id];
  console.log(`  ${n.id}(${n.nodeId}) x=${n.x.toFixed(1)} y=${n.y.toFixed(1)}`);
}
