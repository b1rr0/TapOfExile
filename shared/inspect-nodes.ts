import { TREE_NODES } from "./skill-tree-data";
const nodes = TREE_NODES;

const n120 = nodes.find(n => n.id === 120)!;
const n93 = nodes.find(n => n.id === 93)!;
const dx = n93.x - n120.x;
const dy = n93.y - n120.y;
const dist = Math.sqrt(dx*dx + dy*dy);
console.log(`120 at (${n120.x},${n120.y}), 93 at (${n93.x},${n93.y}), dist=${dist.toFixed(1)}`);

console.log("\n=== samurai arrow after reposition ===");
for (const n of nodes) {
  if (n.nodeId.startsWith("samurai-fig-m0Rfig-")) {
    const d = Math.sqrt((n.x-n120.x)**2 + (n.y-n120.y)**2);
    console.log(`  ${n.id}: ${n.nodeId} at (${Math.round(n.x)},${Math.round(n.y)}) dist_from_120=${d.toFixed(1)} (${(d/dist*100).toFixed(0)}%) conns=[${n.connections}]`);
  }
}
