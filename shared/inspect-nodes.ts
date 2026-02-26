import { buildSkillTree } from "./skill-tree";
const t = buildSkillTree();
console.log("=== Nodes 440-465 ===");
for (let i = 440; i <= 465; i++) {
  const n = t.nodes[i];
  if (!n) continue;
  console.log(`  ${i}: ${n.nodeId} at (${Math.round(n.x)},${Math.round(n.y)}) conns=[${n.connections}]`);
}
// Check b1fig triangle for samurai
console.log("\n=== Samurai b1fig nodes ===");
for (const n of Object.values(t.nodes) as any[]) {
  if (n.nodeId?.startsWith("samurai-b1fig") || n.nodeId?.startsWith("samurai-fig-b1fig"))
    console.log(`  ${n.id}: ${n.nodeId} at (${Math.round(n.x)},${Math.round(n.y)}) conns=[${n.connections}]`);
}
// Check all samurai nodes near (800-1000, 150-450)
console.log("\n=== Samurai nodes near inner-2 area ===");
for (const n of Object.values(t.nodes) as any[]) {
  if (n.nodeId?.startsWith("samurai") && n.x > 700 && n.x < 1050 && n.y > 100 && n.y < 450)
    console.log(`  ${n.id}: ${n.nodeId} at (${Math.round(n.x)},${Math.round(n.y)}) conns=[${n.connections}]`);
}
