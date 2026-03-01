/**
 * Post-generation patch script — applies manual structural modifications to the skill tree.
 *
 * Usage:  npx tsx shared/patch-tree.ts
 *
 * This script loads skill-tree-data.ts, applies user-requested changes,
 * then writes the modified data back.
 */

import * as fs from "fs";
import * as path from "path";

// ── Parse existing data ──────────────────────────────────────

const dataPath = path.resolve(__dirname, "skill-tree-data.ts");
const raw = fs.readFileSync(dataPath, "utf-8");

interface RawNode {
  id: number;
  nodeId: string;
  type: string;
  classAffinity: string;
  x: number;
  y: number;
  label: string;
  name: string | null;
  stat: string | null;
  value: number;
  defId: string | null;
  activeSkillId?: string | null;
  mods: { stat: string; value: number; mode: string }[];
  connections: number[];
  connector: boolean;
}

const nodesMatch = raw.match(
  /export const TREE_NODES: RawNode\[\] = (\[.*?\]);/s,
)!;
const edgesMatch = raw.match(
  /export const TREE_EDGES: \[number, number\]\[\] = (\[.*?\]);/s,
)!;
const emblemsMatch = raw.match(
  /export const TREE_EMBLEMS:.*?= (\[.*?\]);/s,
)!;
const figEdgesMatch = raw.match(
  /export const TREE_FIGURE_EDGES: string\[\] = (\[.*?\]);/s,
)!;
const figMemberMatch = raw.match(
  /export const TREE_FIGURE_MEMBERSHIP: \[number, number\]\[\] = (\[.*?\]);/s,
)!;

let nodes: RawNode[] = JSON.parse(nodesMatch[1]);
let edges: [number, number][] = JSON.parse(edgesMatch[1]);
const emblems: any[] = JSON.parse(emblemsMatch[1]);
let figEdges: string[] = JSON.parse(figEdgesMatch[1]);
let figMembership: [number, number][] = JSON.parse(figMemberMatch[1]);

// ── Helper functions ─────────────────────────────────────────

const nodeById = (id: number) => nodes.find((n) => n.id === id);
const nodeByNodeId = (nid: string) => nodes.find((n) => n.nodeId === nid);

function addEdge(a: number, b: number) {
  // Add to edges array if not exists
  const exists = edges.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
  if (!exists) edges.push([a, b]);

  // Update connections
  const na = nodeById(a);
  const nb = nodeById(b);
  if (na && !na.connections.includes(b)) na.connections.push(b);
  if (nb && !nb.connections.includes(a)) nb.connections.push(a);
}

function removeEdge(a: number, b: number) {
  edges = edges.filter(
    ([x, y]) => !((x === a && y === b) || (x === b && y === a)),
  );
  const na = nodeById(a);
  const nb = nodeById(b);
  if (na) na.connections = na.connections.filter((c) => c !== b);
  if (nb) nb.connections = nb.connections.filter((c) => c !== a);
}

function deleteNode(id: number) {
  const node = nodeById(id);
  if (!node) {
    console.warn(`  [WARN] Node ${id} not found, skipping`);
    return;
  }

  // Remove all edges involving this node
  const neighbors = [...node.connections];
  for (const nb of neighbors) {
    removeEdge(id, nb);
  }

  // Remove from figure edges
  figEdges = figEdges.filter((e) => {
    const [a, b] = e.split("-").map(Number);
    return a !== id && b !== id;
  });

  // Remove from figure membership
  figMembership = figMembership.filter(([nid]) => nid !== id);

  // Remove node
  nodes = nodes.filter((n) => n.id !== id);

  return neighbors;
}

function deleteNodeAndReconnect(id: number, newA: number, newB: number) {
  console.log(
    `  Delete ${id} → reconnect ${newA}↔${newB}`,
  );
  deleteNode(id);
  addEdge(newA, newB);
}

function addFigureEdge(a: number, b: number) {
  const key1 = `${a}-${b}`;
  const key2 = `${b}-${a}`;
  if (!figEdges.includes(key1) && !figEdges.includes(key2)) {
    figEdges.push(key1);
  }
}

function removeFigureEdge(a: number, b: number) {
  const key1 = `${a}-${b}`;
  const key2 = `${b}-${a}`;
  figEdges = figEdges.filter((e) => e !== key1 && e !== key2);
}

function segmentsCross(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): boolean {
  const denom = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (Math.abs(denom) < 1e-10) return false;
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denom;
  const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denom;
  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 1: Delete intermediate minor nodes and reconnect
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 1: Delete intermediate minor nodes ===");

// Delete minor nodes that are between a junction and a figure gate
// Each deletion shortens a tendril by 1 step
deleteNodeAndReconnect(425, 424, 426); // archer m2L
deleteNodeAndReconnect(437, 436, 438); // archer m2R
deleteNodeAndReconnect(123, 122, 124); // samurai m0L
deleteNodeAndReconnect(132, 131, 133); // samurai m0R
deleteNodeAndReconnect(144, 143, 145); // samurai m1L
deleteNodeAndReconnect(156, 155, 157); // samurai m1R
deleteNodeAndReconnect(169, 168, 170); // samurai m2L
deleteNodeAndReconnect(179, 167, 180); // samurai m2 notable→d1
deleteNodeAndReconnect(213, 212, 214); // warrior m0L

console.log("\n=== PHASE 1b: Delete 370 and move 371 to its place ===");
{
  const n370 = nodeById(370)!;
  const n371 = nodeById(371)!;
  const oldPos = { x: n370.x, y: n370.y };
  const dx = oldPos.x - n371.x;
  const dy = oldPos.y - n371.y;

  // 370 connects to [114, 371]. Delete 370, connect 371↔114
  deleteNode(370);
  addEdge(371, 114);

  // Move 371 (and all its figure members) by dx, dy
  const fig23members = figMembership
    .filter(([, fid]) => fid === 23)
    .map(([nid]) => nid);
  console.log(`  Moving figure 23 members by (${dx.toFixed(1)}, ${dy.toFixed(1)}): [${fig23members.join(",")}]`);
  for (const mid of fig23members) {
    const mn = nodeById(mid);
    if (mn) {
      mn.x += dx;
      mn.y += dy;
    }
  }
}

console.log("\n=== PHASE 1c: Delete 523 and reconnect 524,525 to 520 ===");
{
  // 523 connects to [520,524,525]
  deleteNode(523);
  addEdge(524, 520);
  addEdge(525, 520);
  // Update figure edges: replace 523-524, 523-525 with 520-524, 520-525
  addFigureEdge(520, 524);
  addFigureEdge(520, 525);
}

// ═══════════════════════════════════════════════════════════════
// PHASE 1d: Delete 252, 282 (shorten tendrils) + delete 273 (move figure 15 up)
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 1d: Delete nodes by nodeId (user's patched IDs → original nodeIds) ===");

// User referenced patched IDs. Map to original nodeIds for reliable lookup:
// Patched 252 = "warrior-tendril-m2R-d1-s0"
// Patched 282 = "mage-tendril-m0L-d1-s0"
// Patched 273 = "warrior-fig-tendril-s1-d1-gate" (figure gate)
// Patched 272 = "warrior-tendril-s1-d1-s0" (parent tendril step)

{
  const n252 = nodeByNodeId("warrior-tendril-m2R-d1-s0");
  if (n252) {
    const conns = [...n252.connections];
    console.log(`  Delete "${n252.nodeId}" (id=${n252.id}), reconnect ${conns[0]}↔${conns[1]}`);
    deleteNode(n252.id);
    if (conns.length >= 2) addEdge(conns[0], conns[1]);
  }
}

{
  const n282 = nodeByNodeId("mage-tendril-m0L-d1-s0");
  if (n282) {
    const conns = [...n282.connections];
    console.log(`  Delete "${n282.nodeId}" (id=${n282.id}), reconnect ${conns[0]}↔${conns[1]}`);
    deleteNode(n282.id);
    if (conns.length >= 2) addEdge(conns[0], conns[1]);
  }
}

// Delete warrior-fig-tendril-s1-d1-gate and move figure to parent position
{
  const gateNode = nodeByNodeId("warrior-fig-tendril-s1-d1-gate");
  const parentNode = nodeByNodeId("warrior-tendril-s1-d1-s0");

  if (gateNode && parentNode) {
    // Find figure ID of the gate
    const gateEntry = figMembership.find(([nid]) => nid === gateNode.id);
    const figId = gateEntry ? gateEntry[1] : -1;

    const figChildren = gateNode.connections.filter((c) => c !== parentNode.id);
    console.log(`  Delete "${gateNode.nodeId}" (id=${gateNode.id}, fig=${figId}), connect children [${figChildren}] to parent ${parentNode.id}`);

    // Compute delta to move figure toward parent
    const dx = parentNode.x - gateNode.x;
    const dy = parentNode.y - gateNode.y;

    // Get all figure members BEFORE deleting the gate
    const figMembers = figId >= 0
      ? figMembership.filter(([, fid]) => fid === figId).map(([nid]) => nid)
      : [];

    // Delete the gate
    deleteNode(gateNode.id);

    // Connect parent to all figure children
    for (const child of figChildren) {
      addEdge(parentNode.id, child);
    }

    // Move remaining figure keystones by delta
    console.log(`  Moving figure ${figId} keystones by (${dx.toFixed(1)}, ${dy.toFixed(1)})`);
    for (const mid of figMembers) {
      if (mid === gateNode.id) continue;
      const mn = nodeById(mid);
      if (mn) {
        mn.x += dx;
        mn.y += dy;
      }
    }

    // Update figure membership: remove old gate, add parent as new gate
    figMembership = figMembership.filter(([nid]) => nid !== gateNode.id);
    figMembership.push([parentNode.id, figId]);

    // Update figure edges: replace gate references with parent
    figEdges = figEdges.map((e) => {
      const [a, b] = e.split("-").map(Number);
      const na = a === gateNode.id ? parentNode.id : a;
      const nb = b === gateNode.id ? parentNode.id : b;
      return `${na}-${nb}`;
    });

    // Change parent node type to figureEntry
    parentNode.type = "figureEntry";
    console.log(`  "${parentNode.nodeId}" (id=${parentNode.id}) is now figureEntry at (${parentNode.x.toFixed(0)}, ${parentNode.y.toFixed(0)})`);
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 1e: Delete bridge nodes (hypotenuse) + add diamond-arrow figures
// in inter-class triangles
//
// Each triangle had: trunk4 ↔ bridge0 ↔ bridge1 ↔ trunk0  (hypotenuse)
//                    trunk4 ↔ arc ↔ trunk0                  (direct path)
// We delete bridge0 & bridge1, then grow a 7-keystone figure from the arc.
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 1e: Delete bridges + add figures in inter-class triangles ===");
{
  const triangles = [
    { name: "samurai-warrior", arcId: "arc-samurai-warrior", bridge0: "bridge-samurai-warrior-0", bridge1: "bridge-samurai-warrior-1" },
    { name: "warrior-mage", arcId: "arc-warrior-mage", bridge0: "bridge-warrior-mage-0", bridge1: "bridge-warrior-mage-1" },
    { name: "mage-archer", arcId: "arc-mage-archer", bridge0: "bridge-mage-archer-0", bridge1: "bridge-mage-archer-1" },
    { name: "archer-samurai", arcId: "arc-archer-samurai", bridge0: "bridge-archer-samurai-0", bridge1: "bridge-archer-samurai-1" },
  ];

  const maxFigId = Math.max(...figMembership.map(([, fid]) => fid));
  let nextFigId = maxFigId + 1;
  let nextNodeId = Math.max(...nodes.map((n) => n.id)) + 1;

  for (const tri of triangles) {
    const arcNode = nodeByNodeId(tri.arcId);
    if (!arcNode) {
      console.warn(`  [WARN] Arc node "${tri.arcId}" not found!`);
      continue;
    }

    // ── Delete the 2 bridge nodes (hypotenuse) ──
    const b0 = nodeByNodeId(tri.bridge0);
    const b1 = nodeByNodeId(tri.bridge1);
    if (b0) {
      console.log(`  Delete bridge "${tri.bridge0}" (id=${b0.id})`);
      deleteNode(b0.id);
    }
    if (b1) {
      console.log(`  Delete bridge "${tri.bridge1}" (id=${b1.id})`);
      deleteNode(b1.id);
    }

    // ── Create 7-keystone "diamond arrow" figure ──
    const figId = nextFigId++;
    console.log(`  Triangle ${tri.name}: arc=${arcNode.id} → figureEntry, 7 keystones (diamond-arrow), figId=${figId}`);

    arcNode.type = "figureEntry";

    // Direction inward (toward tree center 800,800)
    const cx = 800, cy = 800;
    const toCenter = { x: cx - arcNode.x, y: cy - arcNode.y };
    const len = Math.sqrt(toCenter.x ** 2 + toCenter.y ** 2);
    const inX = toCenter.x / len;
    const inY = toCenter.y / len;
    const perpX = -inY;
    const perpY = inX;

    // Diamond-arrow shape: fan out → widen → converge → fan out again
    //
    //       gate
    //      /    \
    //    ks0    ks1      (row 1: spread ±0.6S at 1.0S inward)
    //     |      |
    //    ks2    ks3      (row 2: wider ±1.1S at 2.0S inward)
    //      \    /
    //       ks4          (pinch: converge at 3.0S inward)
    //      /    \
    //    ks5    ks6      (tips: spread ±0.7S at 4.0S inward)
    //
    const S = 30; // spacing scale (ensures min 30px between keystone pairs)

    const ksPositions = [
      // Row 1 — initial spread
      { dx: inX * S * 1.0 - perpX * S * 0.6, dy: inY * S * 1.0 - perpY * S * 0.6 }, // ks0
      { dx: inX * S * 1.0 + perpX * S * 0.6, dy: inY * S * 1.0 + perpY * S * 0.6 }, // ks1
      // Row 2 — widen
      { dx: inX * S * 2.0 - perpX * S * 1.1, dy: inY * S * 2.0 - perpY * S * 1.1 }, // ks2
      { dx: inX * S * 2.0 + perpX * S * 1.1, dy: inY * S * 2.0 + perpY * S * 1.1 }, // ks3
      // Pinch — converge
      { dx: inX * S * 3.0, dy: inY * S * 3.0 },                                       // ks4
      // Tips — fan out again
      { dx: inX * S * 4.0 - perpX * S * 0.7, dy: inY * S * 4.0 - perpY * S * 0.7 }, // ks5
      { dx: inX * S * 4.0 + perpX * S * 0.7, dy: inY * S * 4.0 + perpY * S * 0.7 }, // ks6
    ];

    const ksIds: number[] = [];
    for (let k = 0; k < 7; k++) {
      const id = nextNodeId++;
      nodes.push({
        id,
        nodeId: `${tri.name}-triangle-ks${k}`,
        type: "keystone",
        classAffinity: arcNode.classAffinity,
        x: arcNode.x + ksPositions[k].dx,
        y: arcNode.y + ksPositions[k].dy,
        label: arcNode.label,
        name: null,
        stat: null,
        value: 0,
        defId: null,
        mods: [],
        connections: [],
        connector: false,
      });
      ksIds.push(id);
    }

    // Diamond-arrow edges: fan → parallel → converge → fan
    const figEdgePairs: [number, number][] = [
      [arcNode.id, ksIds[0]], [arcNode.id, ksIds[1]],     // gate fans out
      [ksIds[0], ksIds[2]], [ksIds[1], ksIds[3]],         // parallel descent (widen)
      [ksIds[2], ksIds[4]], [ksIds[3], ksIds[4]],         // converge at ks4 (pinch)
      [ksIds[4], ksIds[5]], [ksIds[4], ksIds[6]],         // fan out again (tips)
    ];

    for (const [a, b] of figEdgePairs) {
      addEdge(a, b);
      addFigureEdge(a, b);
    }

    figMembership.push([arcNode.id, figId]);
    for (const ks of ksIds) {
      figMembership.push([ks, figId]);
    }

    console.log(`    Keystones: [${ksIds.join(",")}]`);
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2: Simplify bfig hub figures (delete intermediate hub keystone)
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 2: Simplify bfig hub figures ===");

// Figure 32 (samurai-bfig-0): delete 481, connect 482,483 to 478
{
  console.log("  Figure 32: delete 481 → connect 482,483 to 478");
  removeFigureEdge(478, 481);
  removeFigureEdge(481, 482);
  removeFigureEdge(481, 483);
  deleteNode(481);
  addEdge(482, 478);
  addEdge(483, 478);
  addFigureEdge(478, 482);
  addFigureEdge(478, 483);
}

// Figure 36 (mage-bfig-0): delete 505, connect 506,507 to 502
{
  console.log("  Figure 36: delete 505 → connect 506,507 to 502");
  removeFigureEdge(502, 505);
  removeFigureEdge(505, 506);
  removeFigureEdge(505, 507);
  deleteNode(505);
  addEdge(506, 502);
  addEdge(507, 502);
  addFigureEdge(502, 506);
  addFigureEdge(502, 507);
}

// Figure 39 (archer-bfig-1) — 523 already deleted in phase 1c

// ═══════════════════════════════════════════════════════════════
// PHASE 3: Simplify figure 191 (figure 6) to 5 nodes
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 3: Simplify figure 191 (figure 6) ===");
{
  // Current: 191(gate), 192-200 (9 keystones in branching tree)
  // Target: 191(gate) + 4 keystones, rotated upward
  // Delete: 196, 197, 198, 199, 200 (outer leaves)

  // First remove figure edges involving deleted nodes
  const toDelete = [196, 197, 198, 199, 200];
  for (const id of toDelete) {
    const n = nodeById(id);
    if (n) {
      for (const nb of n.connections) {
        removeFigureEdge(id, nb);
      }
    }
  }

  // Delete nodes
  for (const id of toDelete) {
    console.log(`  Delete keystone ${id}`);
    deleteNode(id);
  }

  // Now remaining: 191(gate), 192(ks1), 193(ks2), 194(ks3), 195(ks4)
  // Structure: 191→{192,193}, 192→{191,194,195}, 193→{191}, 194→{192}, 195→{192}
  // Reshape: simple diamond/fan pointing upward-left (away from center 800,800)

  const gate = nodeById(191)!;
  const parentConn = gate.connections.find((c) => c === 190);
  const parent = parentConn !== undefined ? nodeById(parentConn) : null;

  // Direction from parent to gate (= outward direction)
  let dirX = -0.602,
    dirY = -0.799; // default: upper-left
  if (parent) {
    const dx = gate.x - parent.x;
    const dy = gate.y - parent.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dirX = dx / len;
      dirY = dy / len;
    }
  }

  // "Rotate upward" — user wants the figure to point up
  // Override direction to point upward (negative Y)
  dirX = 0;
  dirY = -1;

  // Perpendicular
  const perpX = -dirY;
  const perpY = dirX;

  const S = 18; // scale factor
  // Simple fan shape:
  //   193 ... 192
  //    \      /
  //  195--gate--194
  // But pointing UP from gate:
  //       193
  //      / | \
  //    195 192 194
  //        |
  //      gate(191)

  const ks1 = nodeById(192)!; // center-top
  const ks2 = nodeById(193)!; // top
  const ks3 = nodeById(194)!; // right
  const ks4 = nodeById(195)!; // left

  ks1.x = gate.x + dirX * S * 1.5;
  ks1.y = gate.y + dirY * S * 1.5;

  ks2.x = gate.x + dirX * S * 3;
  ks2.y = gate.y + dirY * S * 3;

  ks3.x = gate.x + dirX * S * 1.5 + perpX * S * 1.2;
  ks3.y = gate.y + dirY * S * 1.5 + perpY * S * 1.2;

  ks4.x = gate.x + dirX * S * 1.5 - perpX * S * 1.2;
  ks4.y = gate.y + dirY * S * 1.5 - perpY * S * 1.2;

  // Rebuild connections for figure nodes
  // Clear existing internal connections
  for (const n of [gate, ks1, ks2, ks3, ks4]) {
    const figMembers = new Set([191, 192, 193, 194, 195]);
    n.connections = n.connections.filter((c) => !figMembers.has(c));
  }

  // Remove old figure edges for this figure
  figEdges = figEdges.filter((e) => {
    const [a, b] = e.split("-").map(Number);
    const figMembers = new Set([191, 192, 193, 194, 195]);
    return !(figMembers.has(a) && figMembers.has(b));
  });

  // Remove old tree edges between figure members
  const fm = new Set([191, 192, 193, 194, 195]);
  edges = edges.filter(
    ([a, b]) => !(fm.has(a) && fm.has(b)),
  );

  // New shape: gate→ks1, ks1→ks2, ks1→ks3, ks1→ks4
  const newFigConnections: [number, number][] = [
    [191, 192], // gate → ks1
    [192, 193], // ks1 → ks2
    [192, 194], // ks1 → ks3
    [192, 195], // ks1 → ks4
    [193, 194], // ks2 ↔ ks3 (top triangle)
    [193, 195], // ks2 ↔ ks4 (top triangle)
  ];

  for (const [a, b] of newFigConnections) {
    addEdge(a, b);
    addFigureEdge(a, b);
  }

  // Update figure membership (remove deleted nodes)
  figMembership = figMembership.filter(
    ([nid]) => !toDelete.includes(nid),
  );

  console.log(
    `  Simplified to 5 nodes. Gate at (${gate.x.toFixed(0)}, ${gate.y.toFixed(0)}), pointing up`,
  );
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4: Add bridge edges between outer ring tendrils
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 4: Add bridge edges ===");

const bridges: [number, number][] = [
  [155, 168],   // samurai m1R ↔ m2L
  [180, 214],   // samurai m2R → warrior m0L gate (routes below figure 203-209)
  [222, 234],   // warrior m0R ↔ m1L
  [243, 255],   // warrior m1R ↔ m2L
  [265, 295],   // warrior m2R ↔ mage m0L
  [304, 317],   // mage m0R ↔ m1L
  [329, 341],   // mage m1R ↔ m2L
  [351, 381],   // mage m2R ↔ archer m0L
  [391, 404],   // archer m0R ↔ m1L
  [413, 424],   // archer m1R ↔ m2L
  [436, 122],   // archer m2R ↔ samurai m0L (outer ring closure)
  [131, 143],   // samurai m0R ↔ m1L
  // NOTE: bridge 170↔212 removed — too long (530px), crosses inner figure
  // Ring path goes: ...168→167→180→(bridge)→214→212→211→...→222→...
];

for (const [a, b] of bridges) {
  const na = nodeById(a);
  const nb = nodeById(b);
  if (!na || !nb) {
    console.warn(`  [WARN] Bridge ${a}↔${b}: node ${!na ? a : b} not found!`);
    continue;
  }
  const dist = Math.sqrt((na.x - nb.x) ** 2 + (na.y - nb.y) ** 2);
  console.log(`  Bridge ${a}↔${b}  dist=${dist.toFixed(0)}`);
  addEdge(a, b);
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4b: Shorten tendrils — delete pass-through parent of each figureEntry
// For each figureEntry with exactly 1 tree-parent:
//   if parent has ≥ 2 other edges (junction) → skip
//   if parent has exactly 1 other edge → delete parent, shift figure back
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 4b: Shorten tendrils at figure entries ===");
{
  // Build a set of all figure-member node IDs (gates + keystones)
  const figNodeSet = new Set(figMembership.map(([nid]) => nid));

  // Snapshot current figureEntry nodes
  const figEntries = nodes.filter((n) => n.type === "figureEntry");

  // Collect candidates before mutating
  const toProcess: {
    gateId: number;
    parentId: number;
    grandparentId: number;
    dx: number;
    dy: number;
    figId: number;
  }[] = [];
  const seenParents = new Set<number>();

  for (const gate of figEntries) {
    // Tree-parents = non-figure neighbours
    const treeParents = gate.connections.filter((c) => !figNodeSet.has(c));
    if (treeParents.length !== 1) continue; // gate at junction or isolated → skip

    const parentId = treeParents[0];
    if (seenParents.has(parentId)) continue;
    seenParents.add(parentId);

    const parent = nodeById(parentId);
    if (!parent) continue;

    // Parent's other edges, NOT counting the edge to this gate
    const parentOtherConns = parent.connections.filter((c) => c !== gate.id);
    if (parentOtherConns.length >= 2) continue; // parent is a junction → skip
    if (parentOtherConns.length === 0) continue; // dead-end safety

    const grandparentId = parentOtherConns[0];
    const dx = parent.x - gate.x;
    const dy = parent.y - gate.y;

    const gateEntry = figMembership.find(([nid]) => nid === gate.id);
    const figId = gateEntry ? gateEntry[1] : -1;

    toProcess.push({ gateId: gate.id, parentId, grandparentId, dx, dy, figId });
  }

  // ── Crossing pre-check: skip candidates where gate→grandparent would cross ──
  function segX(x1:number,y1:number,x2:number,y2:number,x3:number,y3:number,x4:number,y4:number):boolean {
    const d=(x2-x1)*(y4-y3)-(y2-y1)*(x4-x3);
    if(Math.abs(d)<1e-10) return false;
    const t=((x3-x1)*(y4-y3)-(y3-y1)*(x4-x3))/d;
    const u=((x3-x1)*(y2-y1)-(y3-y1)*(x2-x1))/d;
    return t>0.01&&t<0.99&&u>0.01&&u<0.99;
  }

  const safe = toProcess.filter((entry) => {
    const gate = nodeById(entry.gateId);
    const gp = nodeById(entry.grandparentId);
    if (!gate || !gp) return false;

    // Simulate new positions after shift
    const gx = gate.x + entry.dx, gy = gate.y + entry.dy;

    // Figure members that would also be shifted
    const shifted = entry.figId >= 0
      ? new Set(figMembership.filter(([, f]) => f === entry.figId).map(([n]) => n))
      : new Set<number>();

    // Check new edge gate→grandparent against all other existing edges
    for (const [a, b] of edges) {
      if (a === entry.gateId || b === entry.gateId) continue;
      if (a === entry.grandparentId || b === entry.grandparentId) continue;
      if (a === entry.parentId || b === entry.parentId) continue;
      const na = nodeById(a), nb = nodeById(b);
      if (!na || !nb) continue;
      const ax = shifted.has(a) ? na.x + entry.dx : na.x;
      const ay = shifted.has(a) ? na.y + entry.dy : na.y;
      const bx = shifted.has(b) ? nb.x + entry.dx : nb.x;
      const by = shifted.has(b) ? nb.y + entry.dy : nb.y;
      if (segX(gx, gy, gp.x, gp.y, ax, ay, bx, by)) {
        console.log(`  [SKIP] "${gate.nodeId}" → shift would cross edge [${a},${b}]`);
        return false;
      }
    }
    return true;
  });

  // Apply safe deletions
  for (const { gateId, parentId, grandparentId, dx, dy, figId } of safe) {
    const parent = nodeById(parentId);
    const gate = nodeById(gateId);
    if (!parent || !gate) continue;

    console.log(
      `  Delete "${parent.nodeId}" (${parentId}) → shift "${gate.nodeId}" (${gateId}) by (${dx.toFixed(1)}, ${dy.toFixed(1)})`,
    );

    deleteNode(parentId);
    addEdge(gateId, grandparentId);

    // Shift all figure members (gate + keystones) by delta
    const figMembers =
      figId >= 0
        ? figMembership
            .filter(([, fid]) => fid === figId)
            .map(([nid]) => nid)
        : [gateId];

    for (const mid of figMembers) {
      const mn = nodeById(mid);
      if (mn) {
        mn.x += dx;
        mn.y += dy;
      }
    }
  }

  console.log(`  Processed: ${safe.length} deleted, ${toProcess.length - safe.length} skipped (crossing)`);
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4c: Restructure all class start areas
//   — reduce start exits from 4 → 3
//   — add cross-connections for web-like structure
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 4c: Restructure class start areas (4→3 exits, add web) ===");
{
  const classes = ["samurai", "warrior", "mage", "archer"];

  // Crossing pre-check helper
  function segsCrossCheck(x1:number,y1:number,x2:number,y2:number,x3:number,y3:number,x4:number,y4:number):boolean {
    const d=(x2-x1)*(y4-y3)-(y2-y1)*(x4-x3);
    if(Math.abs(d)<1e-10) return false;
    const t=((x3-x1)*(y4-y3)-(y3-y1)*(x4-x3))/d;
    const u=((x3-x1)*(y2-y1)-(y3-y1)*(x2-x1))/d;
    return t>0.01&&t<0.99&&u>0.01&&u<0.99;
  }

  function safeAddEdge(aId: number, bId: number, label: string): boolean {
    const na = nodeById(aId), nb = nodeById(bId);
    if (!na || !nb) return false;
    // Check if new edge crosses any existing edge
    for (const [ea, eb] of edges) {
      if (ea === aId || ea === bId || eb === aId || eb === bId) continue;
      const nea = nodeById(ea), neb = nodeById(eb);
      if (!nea || !neb) continue;
      if (segsCrossCheck(na.x, na.y, nb.x, nb.y, nea.x, nea.y, neb.x, neb.y)) {
        console.log(`    [SKIP] ${label} — would cross [${ea},${eb}]`);
        return false;
      }
    }
    addEdge(aId, bId);
    return true;
  }

  for (const cls of classes) {
    const start = nodeByNodeId(`${cls}-start`);
    const inner1 = nodeByNodeId(`${cls}-inner-1`);
    const iweb0 = nodeByNodeId(`${cls}-iweb-0`);
    const iweb1 = nodeByNodeId(`${cls}-iweb-1`);
    const trunk2 = nodeByNodeId(`${cls}-trunk-2`);
    const trunk3 = nodeByNodeId(`${cls}-trunk-3`);
    const branch2 = nodeByNodeId(`${cls}-branch-2`);
    const branch3 = nodeByNodeId(`${cls}-branch-3`);
    const branch4 = nodeByNodeId(`${cls}-branch-4`);

    if (!start || !inner1 || !iweb0 || !iweb1 || !trunk2 || !trunk3 ||
        !branch2 || !branch3 || !branch4) {
      console.warn(`  [WARN] Missing nodes for ${cls}, skipping`);
      continue;
    }

    let added = 0;

    // 1. Remove start → inner1 (4 → 3 exits from start)
    removeEdge(start.id, inner1.id);

    // 2. Connect inner1 to both iweb nodes (inner1 becomes central hub)
    if (safeAddEdge(inner1.id, iweb0.id, `${cls} inner1↔iweb0`)) added++;
    if (safeAddEdge(inner1.id, iweb1.id, `${cls} inner1↔iweb1`)) added++;

    // 3. Direct cross-link between center trunks
    if (safeAddEdge(trunk2.id, trunk3.id, `${cls} trunk2↔trunk3`)) added++;

    // 4. Branch chain across the outer edge
    if (safeAddEdge(branch2.id, branch3.id, `${cls} branch2↔branch3`)) added++;
    if (safeAddEdge(branch3.id, branch4.id, `${cls} branch3↔branch4`)) added++;

    console.log(`  ${cls}: removed [start,inner1], added ${added} cross-edges`);
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4e-A: Snap non-figure nodes to 20×20 grid (BEFORE 4d so figures use snapped positions)
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 4e-A: Snap non-figure nodes to 20×20 grid ===");
{
  const GRID = 20;
  const figNodeSet = new Set(figMembership.map(([nid]: [number, number]) => nid));
  const occupied = new Map<string, number>(); // "x,y" → nodeId
  let snapped = 0, skippedFig = 0, nudged = 0;

  for (const n of nodes) {
    // Skip figure nodes — they keep original positions
    if (figNodeSet.has(n.id)) {
      skippedFig++;
      continue;
    }

    const gx = Math.round(n.x / GRID) * GRID;
    const gy = Math.round(n.y / GRID) * GRID;
    const key = `${gx},${gy}`;

    if (occupied.has(key)) {
      // Nudge to nearest free adjacent grid cell
      const offsets = [[GRID,0],[-GRID,0],[0,GRID],[0,-GRID],[GRID,GRID],[-GRID,-GRID],[GRID,-GRID],[-GRID,GRID]];
      let placed = false;
      for (const [ox, oy] of offsets) {
        const nk = `${gx+ox},${gy+oy}`;
        if (!occupied.has(nk)) {
          n.x = gx + ox;
          n.y = gy + oy;
          occupied.set(nk, n.id);
          placed = true;
          nudged++;
          break;
        }
      }
      if (!placed) { n.x = gx; n.y = gy; } // fallback
    } else {
      n.x = gx;
      n.y = gy;
      occupied.set(key, n.id);
    }
    snapped++;
  }
  console.log(`  Snapped ${snapped} nodes to ${GRID}×${GRID} grid, nudged ${nudged} for overlaps, skipped ${skippedFig} figure nodes`);
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4d: Add small figures inside class start V-shapes
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 4d: Add small figures inside start areas ===");
{
  const classes = ["samurai", "warrior", "mage", "archer"];

  let maxFigId = Math.max(...figMembership.map(([, fid]) => fid));
  let nextNodeId = Math.max(...nodes.map((n) => n.id)) + 1;

  // Crossing helper (reuse from 4c)
  function figSegsCross(x1:number,y1:number,x2:number,y2:number,x3:number,y3:number,x4:number,y4:number):boolean {
    const d=(x2-x1)*(y4-y3)-(y2-y1)*(x4-x3);
    if(Math.abs(d)<1e-10) return false;
    const t=((x3-x1)*(y4-y3)-(y3-y1)*(x4-x3))/d;
    const u=((x3-x1)*(y2-y1)-(y3-y1)*(x2-x1))/d;
    return t>0.01&&t<0.99&&u>0.01&&u<0.99;
  }

  for (const cls of classes) {
    const start = nodeByNodeId(`${cls}-start`);
    const iweb0 = nodeByNodeId(`${cls}-iweb-0`);
    const iweb1 = nodeByNodeId(`${cls}-iweb-1`);

    if (!start || !iweb0 || !iweb1) {
      console.warn(`  [WARN] Missing nodes for ${cls}, skipping`);
      continue;
    }

    const inner1 = nodeByNodeId(`${cls}-inner-1`);
    if (!inner1) continue;

    const iwebs = [iweb0, iweb1];
    let figCount = 0;

    for (let fi = 0; fi < iwebs.length; fi++) {
      const iweb = iwebs[fi];
      const figId = ++maxFigId;

      // vfig-0: direction from start toward iweb (outward into V)
      // vfig-1: direction from iweb toward inner1 (inward, avoids trunk3 crossings)
      let dx: number, dy: number;
      if (fi === 0) {
        dx = iweb.x - start.x;
        dy = iweb.y - start.y;
      } else {
        dx = inner1.x - iweb.x;
        dy = inner1.y - iweb.y;
      }
      const len = Math.sqrt(dx * dx + dy * dy);
      const dirX = dx / len, dirY = dy / len;
      const perpX = -dirY, perpY = dirX;

      const S = 25; // spacing scale

      // Gate position: offset from iweb along the outward direction
      const gateX = Math.round(iweb.x + dirX * S);
      const gateY = Math.round(iweb.y + dirY * S);

      // 3 keystones: fan pattern from gate
      const ksOffsets = [
        { dx: dirX * S * 0.9 + perpX * S * 0.6, dy: dirY * S * 0.9 + perpY * S * 0.6 }, // ks0 left
        { dx: dirX * S * 0.9 - perpX * S * 0.6, dy: dirY * S * 0.9 - perpY * S * 0.6 }, // ks1 right
        { dx: dirX * S * 1.6, dy: dirY * S * 1.6 },                                       // ks2 tip
      ];

      // Check if all new edges would be crossing-free
      const gatePos = { x: gateX, y: gateY };
      const ksPos = ksOffsets.map((o) => ({
        x: Math.round(gateX + o.dx),
        y: Math.round(gateY + o.dy),
      }));

      // Edges to add: iweb→gate, gate→ks0, gate→ks1, ks0→ks2, ks1→ks2
      // Each edge knows which existing node IDs to skip (shared endpoints)
      const newEdgeDefs: { x1:number; y1:number; x2:number; y2:number; skipIds: number[] }[] = [
        { x1: iweb.x, y1: iweb.y, x2: gatePos.x, y2: gatePos.y, skipIds: [iweb.id] },
        { x1: gatePos.x, y1: gatePos.y, x2: ksPos[0].x, y2: ksPos[0].y, skipIds: [] },
        { x1: gatePos.x, y1: gatePos.y, x2: ksPos[1].x, y2: ksPos[1].y, skipIds: [] },
        { x1: ksPos[0].x, y1: ksPos[0].y, x2: ksPos[2].x, y2: ksPos[2].y, skipIds: [] },
        { x1: ksPos[1].x, y1: ksPos[1].y, x2: ksPos[2].x, y2: ksPos[2].y, skipIds: [] },
      ];

      // Pre-check: all new edges vs all existing edges
      let hasCrossing = false;
      for (const ne of newEdgeDefs) {
        for (const [ea, eb] of edges) {
          if (ne.skipIds.includes(ea) || ne.skipIds.includes(eb)) continue;
          const nea = nodeById(ea), neb = nodeById(eb);
          if (!nea || !neb) continue;
          if (figSegsCross(ne.x1, ne.y1, ne.x2, ne.y2, nea.x, nea.y, neb.x, neb.y)) {
            console.log(`    [SKIP] ${cls} vfig-${fi}: edge would cross [${ea},${eb}] (${nea.nodeId}↔${neb.nodeId})`);
            hasCrossing = true;
            break;
          }
        }
        if (hasCrossing) break;
      }
      if (hasCrossing) continue;

      // Create gate node
      const gateId = nextNodeId++;
      nodes.push({
        id: gateId,
        nodeId: `${cls}-fig-vweb-${fi}-gate`,
        type: "figureEntry" as any,
        classAffinity: cls,
        x: gatePos.x,
        y: gatePos.y,
        label: "Web Gate",
        name: null,
        stat: null,
        value: 0,
        defId: "fe_web",
        mods: [],
        connections: [],
        connector: false,
      });
      addEdge(iweb.id, gateId);
      figMembership.push([gateId, figId]);

      // Create keystones
      const ksIds: number[] = [];
      for (let k = 0; k < 3; k++) {
        const ksId = nextNodeId++;
        nodes.push({
          id: ksId,
          nodeId: `${cls}-fig-vweb-${fi}-ks${k}`,
          type: "keystone" as any,
          classAffinity: cls,
          x: ksPos[k].x,
          y: ksPos[k].y,
          label: "",
          name: null,
          stat: null,
          value: 0,
          defId: null,
          mods: [],
          connections: [],
          connector: false,
        });
        ksIds.push(ksId);
        figMembership.push([ksId, figId]);
      }

      // Figure edges: gate→ks0, gate→ks1, ks0→ks2, ks1→ks2 (diamond shape)
      const figPairs: [number, number][] = [
        [gateId, ksIds[0]],
        [gateId, ksIds[1]],
        [ksIds[0], ksIds[2]],
        [ksIds[1], ksIds[2]],
      ];
      for (const [a, b] of figPairs) {
        addEdge(a, b);
        addFigureEdge(a, b);
      }

      figCount++;
      console.log(`    ${cls} vfig-${fi}: gate=${gateId}, ks=[${ksIds.join(",")}], figId=${figId}`);
    }

    console.log(`  ${cls}: added ${figCount} V-web figures (${figCount * 4} new nodes)`);
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4e-B: Break short cycles by inserting intermediate nodes
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 4e-B: Break short cycles by inserting intermediate nodes ===");
{
  const classes = ["samurai", "warrior", "mage", "archer"];
  let nextId = Math.max(...nodes.map(n => n.id)) + 1;
  let totalInserted = 0;

  // Crossing check helper
  function midSegsCross(x1: number, y1: number, x2: number, y2: number,
                        x3: number, y3: number, x4: number, y4: number): boolean {
    const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
    if (Math.abs(d) < 1e-10) return false;
    const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
    const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
    return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
  }

  const G = 20; // grid step
  // Check if placing mid node at (mx,my) and creating edges [A→mid, mid→B] causes crossings or overlaps
  function findSafeMidPos(aId: number, bId: number, baseMx: number, baseMy: number): { x: number; y: number } | null {
    const na = nodeById(aId)!, nb = nodeById(bId)!;
    // Try base position first, then adjacent grid cells
    const candidates = [
      [0, 0], [G, 0], [-G, 0], [0, G], [0, -G],
      [G, G], [-G, -G], [G, -G], [-G, G],
      [G*2, 0], [-G*2, 0], [0, G*2], [0, -G*2],
    ];
    for (const [ox, oy] of candidates) {
      const mx = baseMx + ox, my = baseMy + oy;
      // Check overlap with existing nodes (must be > GRID apart)
      let tooClose = false;
      for (const n of nodes) {
        if (n.id === aId || n.id === bId) continue;
        const dx = n.x - mx, dy = n.y - my;
        if (Math.sqrt(dx * dx + dy * dy) < G) { tooClose = true; break; }
      }
      if (tooClose) continue;
      let crosses = false;
      for (const [ea, eb] of edges) {
        if (ea === aId || eb === aId || ea === bId || eb === bId) continue;
        const nea = nodeById(ea), neb = nodeById(eb);
        if (!nea || !neb) continue;
        // Check [A→mid]
        if (midSegsCross(na.x, na.y, mx, my, nea.x, nea.y, neb.x, neb.y)) { crosses = true; break; }
        // Check [mid→B]
        if (midSegsCross(mx, my, nb.x, nb.y, nea.x, nea.y, neb.x, neb.y)) { crosses = true; break; }
      }
      if (!crosses) return { x: mx, y: my };
    }
    return null;
  }

  const edgeSuffixes: [string, string][] = [
    // inner-1↔trunk-2 handled by Phase 4e-C (4-node figure)
    // inner-1↔trunk-3, inner-1↔iweb-1, trunk-2↔trunk-3 stay as direct edges
    ["inner-1", "iweb-0"],
    ["branch-2", "branch-3"],
    ["branch-3", "branch-4"],
  ];

  for (const cls of classes) {
    let inserted = 0;
    for (const [sA, sB] of edgeSuffixes) {
      const nA = nodeByNodeId(`${cls}-${sA}`);
      const nB = nodeByNodeId(`${cls}-${sB}`);
      if (!nA || !nB) continue;

      // Check edge actually exists
      const edgeIdx = edges.findIndex(([a, b]) =>
        (a === nA.id && b === nB.id) || (a === nB.id && b === nA.id));
      if (edgeIdx < 0) continue;

      // Grid-snapped midpoint
      const baseMx = Math.round(((nA.x + nB.x) / 2) / G) * G;
      const baseMy = Math.round(((nA.y + nB.y) / 2) / G) * G;

      // Find crossing-safe position
      const safePos = findSafeMidPos(nA.id, nB.id, baseMx, baseMy);
      if (!safePos) {
        console.log(`    [SKIP] ${cls}: [${sA}, ${sB}] — no safe mid position found`);
        continue;
      }

      const midId = nextId++;
      nodes.push({
        id: midId,
        nodeId: `${cls}-mid4e-${sA.replace(/-/g, "")}-${sB.replace(/-/g, "")}`,
        type: "minor",
        classAffinity: cls,
        x: safePos.x,
        y: safePos.y,
        label: "",
        name: null,
        stat: null,
        value: 0,
        defId: null,
        mods: [],
        connections: [],
        connector: false,
      });

      removeEdge(nA.id, nB.id);
      addEdge(nA.id, midId);
      addEdge(midId, nB.id);
      inserted++;
      const nudgeLabel = (safePos.x !== baseMx || safePos.y !== baseMy) ? ` (nudged from ${baseMx},${baseMy})` : "";
      console.log(`    ${cls}: split [${sA}, ${sB}] → mid4e node ${midId} at (${safePos.x},${safePos.y})${nudgeLabel}`);
    }
    totalInserted += inserted;
    console.log(`  ${cls}: split ${inserted} edges`);
  }
  console.log(`  Total: inserted ${totalInserted} intermediate nodes`);
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4e-C: Replace inner-1↔trunk-2 edge with 4-node figure
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 4e-C: 4-node figure between inner-1 and trunk-2 (all classes) ===");
{
  /*  Layout (relative to direction inner-1 → trunk-2):
   *
   *           1          ← top, connects to trunk-2
   *    2 --------- 3     ← middle row, spread perpendicular
   *           4          ← bottom, connects to inner-1
   *
   *  Edges: 1-3, 2-1, 2-4, 3-4
   *  External: 1↔trunk-2, inner-1↔4
   */
  const classes = ["samurai", "warrior", "mage", "archer"];
  let nextId = Math.max(...nodes.map(n => n.id)) + 1;

  for (const cls of classes) {
    const inner1 = nodeByNodeId(`${cls}-inner-1`);
    const trunk2 = nodeByNodeId(`${cls}-trunk-2`);
    if (!inner1 || !trunk2) { console.warn(`  [WARN] ${cls}: missing inner-1 or trunk-2`); continue; }

    // Remove direct edge inner-1↔trunk-2
    removeEdge(inner1.id, trunk2.id);

    // Direction from inner-1 to trunk-2
    const dx = trunk2.x - inner1.x;
    const dy = trunk2.y - inner1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const dirX = dx / len, dirY = dy / len;
    const perpX = -dirY, perpY = dirX;

    // Midpoint between inner-1 and trunk-2
    const mx = (inner1.x + trunk2.x) / 2;
    const my = (inner1.y + trunk2.y) / 2;

    // Spacing
    const spanY = len * 0.3; // vertical spread along direction
    const spanX = 25;        // horizontal spread perpendicular

    // Positions (not grid-snapped — this is a figure)
    const pos1 = { x: Math.round(mx + dirX * spanY), y: Math.round(my + dirY * spanY) };
    const pos4 = { x: Math.round(mx - dirX * spanY), y: Math.round(my - dirY * spanY) };
    const pos2 = { x: Math.round(mx - perpX * spanX), y: Math.round(my - perpY * spanX) };
    const pos3 = { x: Math.round(mx + perpX * spanX), y: Math.round(my + perpY * spanX) };

    const makeNode = (suffix: string, type: string, pos: {x:number,y:number}) => {
      const id = nextId++;
      nodes.push({
        id, nodeId: `${cls}-web4e-${suffix}`, type, classAffinity: cls,
        x: pos.x, y: pos.y, label: "", name: null, stat: null, value: 0,
        defId: type === "figureEntry" ? "fe_web" : null, mods: [], connections: [], connector: false,
      });
      return id;
    };

    const id1 = makeNode("n1", "minor", pos1);
    const id2 = makeNode("n2", "minor", pos2);
    const id3 = makeNode("n3", "minor", pos3);
    const id4 = makeNode("n4", "minor", pos4);

    // Internal edges: 1-3, 2-1, 2-4, 3-4
    addEdge(id1, id3);
    addEdge(id2, id1);
    addEdge(id2, id4);
    addEdge(id3, id4);

    // External connections: 1↔trunk-2, inner-1↔4
    addEdge(id1, trunk2.id);
    addEdge(inner1.id, id4);

    console.log(`  ${cls}: web4e figure [${id1},${id2},${id3},${id4}] between inner-1(${inner1.id}) and trunk-2(${trunk2.id})`);
    console.log(`    positions: n1=(${pos1.x},${pos1.y}) n2=(${pos2.x},${pos2.y}) n3=(${pos3.x},${pos3.y}) n4=(${pos4.x},${pos4.y})`);
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4e-D: Delete pass-through nodes + remove inner-1↔trunk-3 edge (all classes)
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 4e-D: Cleanup — delete nodes & remove edges (all classes) ===");
{
  const classes = ["samurai", "warrior", "mage", "archer"];

  for (const cls of classes) {
    // 1. Delete tendril-m1-d2-s0 (pass-through)
    const tendrilM1 = nodeByNodeId(`${cls}-tendril-m1-d2-s0`);
    if (tendrilM1 && tendrilM1.connections.length === 2) {
      const [a, b] = tendrilM1.connections;
      deleteNodeAndReconnect(tendrilM1.id, a, b);
      console.log(`  ${cls}: deleted tendril-m1-d2-s0 (${tendrilM1.id}), reconnected ${a}↔${b}`);
    }

    // 2. Delete mid-2 (pass-through trunk-4 ↔ branch-3)
    const mid2 = nodeByNodeId(`${cls}-mid-2`);
    if (mid2 && mid2.connections.length === 2) {
      const [a, b] = mid2.connections;
      deleteNodeAndReconnect(mid2.id, a, b);
      console.log(`  ${cls}: deleted mid-2 (${mid2.id}), reconnected ${a}↔${b}`);
    }

    // 3. Remove edge inner-1 ↔ trunk-3
    const inner1 = nodeByNodeId(`${cls}-inner-1`);
    const trunk3 = nodeByNodeId(`${cls}-trunk-3`);
    if (inner1 && trunk3) {
      removeEdge(inner1.id, trunk3.id);
      console.log(`  ${cls}: removed edge inner-1(${inner1.id})↔trunk-3(${trunk3.id})`);
    }

    // 4. Delete tendril-m0-d2-s0 (pass-through branch-0 ↔ tendril-m0-d2-s1)
    const tendrilM0 = nodeByNodeId(`${cls}-tendril-m0-d2-s0`);
    if (tendrilM0 && tendrilM0.connections.length === 2) {
      const [a, b] = tendrilM0.connections;
      // Check if reconnection would cross existing edges
      const na = nodeById(a), nb = nodeById(b);
      let wouldCross = false;
      if (na && nb) {
        for (const [ea, eb] of edges) {
          if (ea === a || ea === b || eb === a || eb === b || ea === tendrilM0.id || eb === tendrilM0.id) continue;
          const nea = nodeById(ea), neb = nodeById(eb);
          if (!nea || !neb) continue;
          const d2 = (nb.x - na.x) * (neb.y - nea.y) - (nb.y - na.y) * (neb.x - nea.x);
          if (Math.abs(d2) < 1e-10) continue;
          const t2 = ((nea.x - na.x) * (neb.y - nea.y) - (nea.y - na.y) * (neb.x - nea.x)) / d2;
          const u2 = ((nea.x - na.x) * (nb.y - na.y) - (nea.y - na.y) * (nb.x - na.x)) / d2;
          if (t2 > 0.01 && t2 < 0.99 && u2 > 0.01 && u2 < 0.99) { wouldCross = true; break; }
        }
      }
      if (wouldCross) {
        // Don't reconnect — just delete the node, losing both edges
        deleteNode(tendrilM0.id);
        console.log(`  ${cls}: deleted tendril-m0-d2-s0 (${tendrilM0.id}), NO reconnect (would cross)`);
      } else {
        deleteNodeAndReconnect(tendrilM0.id, a, b);
        console.log(`  ${cls}: deleted tendril-m0-d2-s0 (${tendrilM0.id}), reconnected ${a}↔${b}`);
      }
    }

    // 5. Delete mid-0 (pass-through trunk-0 ↔ branch-1)
    const mid0 = nodeByNodeId(`${cls}-mid-0`);
    if (mid0 && mid0.connections.length === 2) {
      const [a, b] = mid0.connections;
      deleteNodeAndReconnect(mid0.id, a, b);
      console.log(`  ${cls}: deleted mid-0 (${mid0.id}), reconnected ${a}↔${b}`);
    }

    // 6. Add edge branch-1 ↔ tendril-m0-d2-s1
    const branch1 = nodeByNodeId(`${cls}-branch-1`);
    const tendrilM0d2s1 = nodeByNodeId(`${cls}-tendril-m0-d2-s1`);
    if (branch1 && tendrilM0d2s1) {
      addEdge(branch1.id, tendrilM0d2s1.id);
      console.log(`  ${cls}: added edge branch-1(${branch1.id})↔tendril-m0-d2-s1(${tendrilM0d2s1.id})`);
    }

    // 7. Delete mid-1 (pass-through trunk-1 ↔ branch-2)
    const mid1 = nodeByNodeId(`${cls}-mid-1`);
    if (mid1 && mid1.connections.length === 2) {
      const [a, b] = mid1.connections;
      deleteNodeAndReconnect(mid1.id, a, b);
      console.log(`  ${cls}: deleted mid-1 (${mid1.id}), reconnected ${a}↔${b}`);
    }

    // 8. Delete tendril-m2-d2-s0 (pass-through branch-4 ↔ tendril-m2-d2-s1)
    const tendrilM2 = nodeByNodeId(`${cls}-tendril-m2-d2-s0`);
    if (tendrilM2 && tendrilM2.connections.length === 2) {
      const [a, b] = tendrilM2.connections;
      deleteNodeAndReconnect(tendrilM2.id, a, b);
      console.log(`  ${cls}: deleted tendril-m2-d2-s0 (${tendrilM2.id}), reconnected ${a}↔${b}`);
    }

    // 9. Remove edge inner-0 ↔ iweb-0
    const inner0 = nodeByNodeId(`${cls}-inner-0`);
    const iweb0 = nodeByNodeId(`${cls}-iweb-0`);
    if (inner0 && iweb0) {
      removeEdge(inner0.id, iweb0.id);
      console.log(`  ${cls}: removed edge inner-0(${inner0.id})↔iweb-0(${iweb0.id})`);
    }

    // 10. Remove edge iweb-1 ↔ inner-2, then delete iweb-1
    const iweb1 = nodeByNodeId(`${cls}-iweb-1`);
    const inner2 = nodeByNodeId(`${cls}-inner-2`);
    if (iweb1 && inner2) {
      removeEdge(iweb1.id, inner2.id);
      console.log(`  ${cls}: removed edge iweb-1(${iweb1.id})↔inner-2(${inner2.id})`);
    }
    if (iweb1) {
      // Reconnect remaining neighbors if exactly 2, otherwise full delete
      const n = nodeById(iweb1.id);
      if (n && n.connections.length === 2) {
        const [a, b] = n.connections;
        deleteNodeAndReconnect(iweb1.id, a, b);
        console.log(`  ${cls}: deleted iweb-1 (${iweb1.id}), reconnected ${a}↔${b}`);
      } else if (n) {
        deleteNode(iweb1.id);
        console.log(`  ${cls}: deleted iweb-1 (${iweb1.id}) (${n.connections.length} connections lost)`);
      }
    }

    // 11. Add edge inner-1 ↔ start (restore connection removed in Phase 4c)
    const start = nodeByNodeId(`${cls}-start`);
    if (inner1 && start) {
      addEdge(inner1.id, start.id);
      console.log(`  ${cls}: added edge inner-1(${inner1.id})↔start(${start.id})`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4e-E: Final adjustments — delete intermediates, align, mirror bfig, add figure
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 4e-E: Final adjustments (all classes) ===");
{
  const classes = ["samurai", "warrior", "mage", "archer"];
  let nextId = Math.max(...nodes.map(n => n.id)) + 1;

  for (const cls of classes) {
    console.log(`  ${cls}:`);

    // --- Determine tree growth axis ---
    const inner1 = nodeByNodeId(`${cls}-inner-1`);
    const branch2 = nodeByNodeId(`${cls}-branch-2`);
    if (!inner1 || !branch2) continue;
    const dxIB = Math.abs(inner1.x - branch2.x);
    const dyIB = Math.abs(inner1.y - branch2.y);
    const alignX = dxIB < dyIB; // true → tree grows along Y, align X coords

    // 1. Delete mid4e-inner1-iweb0 (pass-through inner-1 ↔ iweb-0)
    const midII = nodeByNodeId(`${cls}-mid4e-inner1-iweb0`);
    if (midII) {
      const n = nodeById(midII.id);
      if (n && n.connections.length === 2) {
        const [a, b] = n.connections;
        deleteNodeAndReconnect(midII.id, a, b);
        console.log(`    deleted mid4e-inner1-iweb0 (${midII.id}), reconnected ${a}↔${b}`);
      }
    }

    // 2. Delete mid4e-branch3-branch4 (pass-through branch-3 ↔ branch-4)
    const midBB = nodeByNodeId(`${cls}-mid4e-branch3-branch4`);
    if (midBB) {
      const n = nodeById(midBB.id);
      if (n && n.connections.length === 2) {
        const [a, b] = n.connections;
        deleteNodeAndReconnect(midBB.id, a, b);
        console.log(`    deleted mid4e-branch3-branch4 (${midBB.id}), reconnected ${a}↔${b}`);
      }
    }

    // 3. Move trunk-3 to same level as iweb-0
    const trunk3 = nodeByNodeId(`${cls}-trunk-3`);
    const iweb0 = nodeByNodeId(`${cls}-iweb-0`);
    if (trunk3 && iweb0) {
      if (alignX) {
        const old = trunk3.y;
        trunk3.y = iweb0.y;
        console.log(`    trunk-3 y: ${old} → ${trunk3.y} (matched iweb-0)`);
      } else {
        const old = trunk3.x;
        trunk3.x = iweb0.x;
        console.log(`    trunk-3 x: ${old} → ${trunk3.x} (matched iweb-0)`);
      }
    }

    // 4. Align inner-1, trunk-2, branch-2 on same line + recompute web4e figure
    const trunk2 = nodeByNodeId(`${cls}-trunk-2`);
    const web4eN1 = nodeByNodeId(`${cls}-web4e-n1`);
    const web4eN2 = nodeByNodeId(`${cls}-web4e-n2`);
    const web4eN3 = nodeByNodeId(`${cls}-web4e-n3`);
    const web4eN4 = nodeByNodeId(`${cls}-web4e-n4`);

    if (inner1 && trunk2 && branch2 && web4eN1 && web4eN2 && web4eN3 && web4eN4) {
      if (alignX) {
        const target = inner1.x;
        trunk2.x = target;
        branch2.x = target;
        console.log(`    aligned X=${target}: trunk-2, branch-2`);
      } else {
        const target = inner1.y;
        trunk2.y = target;
        branch2.y = target;
        console.log(`    aligned Y=${target}: trunk-2, branch-2`);
      }

      // Recompute web4e figure positions based on aligned inner-1 and trunk-2
      const dxW = trunk2.x - inner1.x;
      const dyW = trunk2.y - inner1.y;
      const lenW = Math.sqrt(dxW * dxW + dyW * dyW);
      const dirWX = dxW / lenW, dirWY = dyW / lenW;
      const perpWX = -dirWY, perpWY = dirWX;
      const mxW = (inner1.x + trunk2.x) / 2;
      const myW = (inner1.y + trunk2.y) / 2;
      const spanDir = lenW * 0.3;
      const spanPerp = 25;

      web4eN1.x = Math.round(mxW + dirWX * spanDir);
      web4eN1.y = Math.round(myW + dirWY * spanDir);
      web4eN4.x = Math.round(mxW - dirWX * spanDir);
      web4eN4.y = Math.round(myW - dirWY * spanDir);
      web4eN2.x = Math.round(mxW - perpWX * spanPerp);
      web4eN2.y = Math.round(myW - perpWY * spanPerp);
      web4eN3.x = Math.round(mxW + perpWX * spanPerp);
      web4eN3.y = Math.round(myW + perpWY * spanPerp);
      console.log(`    recomputed web4e: n1=(${web4eN1.x},${web4eN1.y}), n4=(${web4eN4.x},${web4eN4.y}), n2=(${web4eN2.x},${web4eN2.y}), n3=(${web4eN3.x},${web4eN3.y})`);
    }

    // 5. Mirror bfig-1 figure to other side of branch-3
    const branch3 = nodeByNodeId(`${cls}-branch-3`);
    const bfigGate = nodeByNodeId(`${cls}-fig-bfig-1-gate`);
    if (branch3 && bfigGate) {
      const gateEntry = figMembership.find(([nid]: [number, number]) => nid === bfigGate.id);
      const figId = gateEntry ? gateEntry[1] : -1;
      const figMembers = figId >= 0
        ? figMembership.filter(([, fid]: [number, number]) => fid === figId).map(([nid]: [number, number]) => nid)
        : [];

      for (const mid of figMembers) {
        const mn = nodeById(mid);
        if (mn) {
          if (alignX) {
            mn.x = 2 * branch3.x - mn.x; // mirror X only
          } else {
            mn.y = 2 * branch3.y - mn.y; // mirror Y only
          }
        }
      }
      console.log(`    mirrored bfig-1 (fig ${figId}, ${figMembers.length} members) through branch-3 (${alignX ? "X" : "Y"} axis)`);
    }

    // 6. Create web4eR (triangle + center keystone) connected to trunk-3 + direct edge trunk-3↔inner-1
    if (trunk3 && inner1) {
      // Remove direct edge trunk-3↔inner-1 if it exists (from Phase 4e-D)
      removeEdge(trunk3.id, inner1.id);

      // Direction from inner-1 to trunk-3
      const dxR = trunk3.x - inner1.x;
      const dyR = trunk3.y - inner1.y;
      const lenR = Math.sqrt(dxR * dxR + dyR * dyR);
      const dirRX = dxR / lenR, dirRY = dyR / lenR;
      const perpRX = -dirRY, perpRY = dirRX;
      const mxR = (inner1.x + trunk3.x) / 2;
      const myR = (inner1.y + trunk3.y) / 2;

      // --- 6a. web4eR: triangle {n1,n2,n3} + center keystone n4 ---
      const figOffset = 35;
      const figCx = mxR + perpRX * figOffset;
      const figCy = myR + perpRY * figOffset;
      const spanDirR = lenR * 0.22;
      const spanPerpR = 20;

      // Outer triangle: n1 near trunk-3, n2/n3 spread perpendicular
      const posR1 = { x: Math.round(figCx + dirRX * spanDirR), y: Math.round(figCy + dirRY * spanDirR) };
      const posR2 = { x: Math.round(figCx - perpRX * spanPerpR), y: Math.round(figCy - perpRY * spanPerpR) };
      const posR3 = { x: Math.round(figCx + perpRX * spanPerpR), y: Math.round(figCy + perpRY * spanPerpR) };
      // Center keystone at centroid of triangle
      const posR4 = {
        x: Math.round((posR1.x + posR2.x + posR3.x) / 3),
        y: Math.round((posR1.y + posR2.y + posR3.y) / 3),
      };

      const makeWebR = (suffix: string, type: string, pos: {x:number,y:number}) => {
        const id = nextId++;
        nodes.push({
          id, nodeId: `${cls}-web4eR-${suffix}`, type: type as any, classAffinity: cls,
          x: pos.x, y: pos.y, label: "", name: null, stat: null, value: 0,
          defId: null, mods: [], connections: [], connector: false,
        });
        return id;
      };

      const rId1 = makeWebR("n1", "minor", posR1);
      const rId2 = makeWebR("n2", "minor", posR2);
      const rId3 = makeWebR("n3", "minor", posR3);
      const rId4 = makeWebR("n4", "keystone", posR4); // center keystone

      // Triangle edges: n1↔n2, n1↔n3, n2↔n3
      addEdge(rId1, rId2);
      addEdge(rId1, rId3);
      addEdge(rId2, rId3);
      // Center keystone connects to n1
      addEdge(rId4, rId1);
      // External: n1 directly connected to trunk-3
      addEdge(rId1, trunk3.id);

      console.log(`    added web4eR [${rId1},${rId2},${rId3},${rId4}(ks)] n1↔trunk-3(${trunk3.id})`);

      // --- 6b. Direct edge trunk-3 ↔ inner-1 ---
      addEdge(trunk3.id, inner1.id);
      console.log(`    added direct edge trunk-3(${trunk3.id})↔inner-1(${inner1.id})`);

      // --- 6c. Delete mid4e-branch2-branch3 (pass-through) ---
      const midBB23 = nodeByNodeId(`${cls}-mid4e-branch2-branch3`);
      if (midBB23) {
        const n = nodeById(midBB23.id);
        if (n && n.connections.length === 2) {
          const [a, b] = n.connections;
          deleteNodeAndReconnect(midBB23.id, a, b);
          console.log(`    deleted mid4e-branch2-branch3 (${midBB23.id}), reconnected ${a}↔${b}`);
        }
      }

      // --- 6d. Keystone center in web4e ---
      if (web4eN2 && web4eN3 && web4eN1) {
        const centerX = Math.round((web4eN2.x + web4eN3.x) / 2);
        const centerY = Math.round((web4eN2.y + web4eN3.y) / 2);
        const centerId = nextId++;
        nodes.push({
          id: centerId, nodeId: `${cls}-web4e-center`, type: "keystone" as any, classAffinity: cls,
          x: centerX, y: centerY, label: "", name: null, stat: null, value: 0,
          defId: null, mods: [], connections: [], connector: false,
        });
        addEdge(centerId, web4eN1.id);
        console.log(`    added web4e-center (keystone) id=${centerId} at (${centerX},${centerY})`);
      }

      // --- 6e. Delete trunk-1 and inner-0 (not needed, tree stays connected) ---
      const trunk1 = nodeByNodeId(`${cls}-trunk-1`);
      if (trunk1) {
        deleteNode(trunk1.id);
        console.log(`    deleted trunk-1 (${trunk1.id})`);
      }
      const inner0 = nodeByNodeId(`${cls}-inner-0`);
      if (inner0) {
        deleteNode(inner0.id);
        console.log(`    deleted inner-0 (${inner0.id})`);
      }
    }
  }
  console.log(`  Done.`);
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5: Position adjustments
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 5: Position adjustments ===");

// Node 212 position: no adjustment needed since bridge 170↔212 was removed
// Bridge 180↔214 routes below the figure (203-209) naturally

// Rotate figure at warrior-fig-tendril-m2R-d1-gate to avoid crossings with bridge 265↔295
{
  const gateNode = nodeByNodeId("warrior-fig-tendril-m2R-d1-gate");
  if (gateNode) {
    // Find figure ID of this gate
    const gateEntry = figMembership.find(([nid]) => nid === gateNode.id);
    const figId = gateEntry ? gateEntry[1] : -1;
    const figMembers = figId >= 0
      ? figMembership.filter(([, fid]) => fid === figId).map(([nid]) => nid)
      : [];

    console.log(`  Rotating figure ${figId} (gate ${gateNode.id} "${gateNode.nodeId}") members: [${figMembers.join(",")}]`);

    // Rotate around gate to avoid bridge crossing
    const gx = gateNode.x;
    const gy = gateNode.y;

    // Small rotation (~15°) to clear the bridge path
    const angle = -0.26; // ~-15 degrees
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (const mid of figMembers) {
      if (mid === gateNode.id) continue; // don't rotate the gate itself
      const mn = nodeById(mid);
      if (mn) {
        const rx = mn.x - gx;
        const ry = mn.y - gy;
        mn.x = gx + rx * cos - ry * sin;
        mn.y = gy + rx * sin + ry * cos;
      }
    }
    console.log(`  Rotated by ${((angle * 180) / Math.PI).toFixed(1)}°`);
  }
}

// (Removed: bfig-1 rotation — replaced by mirror in Phase 4e-E)

// Add edge samurai-start ↔ samurai-trunk-0
{
  const sStart = nodeByNodeId("samurai-start");
  const sTrunk0 = nodeByNodeId("samurai-trunk-0");
  if (sStart && sTrunk0) {
    addEdge(sStart.id, sTrunk0.id);
    console.log(`  Added edge samurai-start(${sStart.id})↔samurai-trunk-0(${sTrunk0.id})`);
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5b: Adjust outer-circle figures — shorten + rotate tangential
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 5b: Adjust outer-circle figures ===");
{
  const CX = 800, CY = 800;
  const TARGET_GATE_DIST = 60; // reference: node 163→164 distance
  const FIG_SCALE = 0.75; // compact figures slightly to avoid inter-figure crossings
  const figNodeSet5 = new Set(figMembership.map(([nid]: [number, number]) => nid));

  const figEntries5 = nodes.filter((n) => n.type === "figureEntry");
  let adjusted = 0;

  for (const gate of figEntries5) {
    const r = Math.sqrt((gate.x - CX) ** 2 + (gate.y - CY) ** 2);
    if (r < 850) continue; // skip inner-ring figures

    // Tree parents = non-figure neighbors
    const treeParents = gate.connections.filter((c: number) => !figNodeSet5.has(c));
    if (treeParents.length === 0) continue;

    // Pick parent closest to center (the "tree-side" parent)
    let parentId = treeParents[0];
    if (treeParents.length > 1) {
      let minR = Infinity;
      for (const pid of treeParents) {
        const p = nodeById(pid);
        if (!p) continue;
        const pr = Math.sqrt((p.x - CX) ** 2 + (p.y - CY) ** 2);
        if (pr < minR) { minR = pr; parentId = pid; }
      }
    }
    const parent = nodeById(parentId);
    if (!parent) continue;

    // Get figure members
    const gateEntry = figMembership.find(([nid]: [number, number]) => nid === gate.id);
    const figId = gateEntry ? gateEntry[1] : -1;
    const figMembers = figId >= 0
      ? figMembership.filter(([, fid]: [number, number]) => fid === figId).map(([nid]: [number, number]) => nid)
      : [gate.id];

    // --- 1. Shorten gate-to-parent distance to TARGET_GATE_DIST ---
    const dx = gate.x - parent.x;
    const dy = gate.y - parent.y;
    const currentDist = Math.sqrt(dx * dx + dy * dy);

    if (currentDist > 1) {
      const dirX = dx / currentDist;
      const dirY = dy / currentDist;
      const newGateX = parent.x + dirX * TARGET_GATE_DIST;
      const newGateY = parent.y + dirY * TARGET_GATE_DIST;
      const shiftX = newGateX - gate.x;
      const shiftY = newGateY - gate.y;

      for (const mid of figMembers) {
        const mn = nodeById(mid);
        if (mn) { mn.x += shiftX; mn.y += shiftY; }
      }
    }

    // --- 2. Rotate figure to be tangential to outer circle ---
    // Compute body centroid direction (gate → average of keystones)
    let bodyDx = 0, bodyDy = 0, keyCount = 0;
    for (const mid of figMembers) {
      if (mid === gate.id) continue;
      const mn = nodeById(mid);
      if (mn) { bodyDx += mn.x - gate.x; bodyDy += mn.y - gate.y; keyCount++; }
    }
    if (keyCount === 0) continue;
    bodyDx /= keyCount; bodyDy /= keyCount;
    const bodyAngle = Math.atan2(bodyDy, bodyDx);

    // Radial direction at gate
    const radX = gate.x - CX;
    const radY = gate.y - CY;

    // Parent direction from gate (for choosing tangent side)
    const parentDx = parent.x - gate.x;
    const parentDy = parent.y - gate.y;
    const cross = parentDx * radY - parentDy * radX;

    // Tangent away from parent
    let tanX: number, tanY: number;
    if (cross > 0) {
      tanX = radY; tanY = -radX; // CW tangent
    } else {
      tanX = -radY; tanY = radX; // CCW tangent
    }
    const targetAngle = Math.atan2(tanY, tanX);

    let angle = targetAngle - bodyAngle;
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;

    // If rotation > 100°, flip to opposite tangent to avoid crossing past tangential
    if (Math.abs(angle) > 100 * Math.PI / 180) {
      angle += angle > 0 ? -Math.PI : Math.PI;
    }

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Apply rotation + scale
    const applyRotScale = (a: number) => {
      const c = Math.cos(a), s = Math.sin(a);
      for (const mid of figMembers) {
        if (mid === gate.id) continue;
        const mn = nodeById(mid);
        if (mn) {
          const rx = mn.x - gate.x;
          const ry = mn.y - gate.y;
          mn.x = gate.x + (rx * c - ry * s) * FIG_SCALE;
          mn.y = gate.y + (rx * s + ry * c) * FIG_SCALE;
        }
      }
    };

    // Segment intersection check (for gate↔parent vs figure edges)
    const segXCheck = (x1:number,y1:number,x2:number,y2:number,x3:number,y3:number,x4:number,y4:number) => {
      const d=(x2-x1)*(y4-y3)-(y2-y1)*(x4-x3);
      if(Math.abs(d)<1e-10) return false;
      const t=((x3-x1)*(y4-y3)-(y3-y1)*(x4-x3))/d;
      const u=((x3-x1)*(y2-y1)-(y3-y1)*(x2-x1))/d;
      return t>0.01&&t<0.99&&u>0.01&&u<0.99;
    };

    applyRotScale(angle);

    // Check if any figure edge crosses gate↔parent; if so, flip rotation
    let hasCross = false;
    const figEdgesLocal = figMembers.filter(m => m !== gate.id);
    for (let i = 0; i < figEdgesLocal.length && !hasCross; i++) {
      const na = nodeById(figEdgesLocal[i]);
      for (let j = i + 1; j < figEdgesLocal.length && !hasCross; j++) {
        const nb = nodeById(figEdgesLocal[j]);
        if (!na || !nb) continue;
        // Check if this keystone pair edge crosses gate↔parent
        if (na.connections.includes(nb.id) || nb.connections.includes(na.id)) {
          if (segXCheck(gate.x, gate.y, parent.x, parent.y, na.x, na.y, nb.x, nb.y)) {
            hasCross = true;
          }
        }
      }
    }

    if (hasCross) {
      // Undo rotation (reverse) then apply flipped
      const undoAngle = -angle;
      const flipAngle = -angle; // net: rotate -2*angle (flip to other side)
      // Reset to pre-rotation positions then apply flipped
      const cU = Math.cos(undoAngle / FIG_SCALE), sU = Math.sin(undoAngle / FIG_SCALE);
      // Simpler: just recompute from unscaled/unrotated positions
      // We need to undo: x = gx + (rx*cosA - ry*sinA)*S → rx = ((x-gx)/S * cosA + (y-gy)/S * sinA), etc.
      // Instead: just apply the reverse rotation angle on current positions (which are already scaled)
      const flipTotal = -2 * angle; // rotate from current to opposite side
      const cF = Math.cos(flipTotal), sF = Math.sin(flipTotal);
      for (const mid of figMembers) {
        if (mid === gate.id) continue;
        const mn = nodeById(mid);
        if (mn) {
          const rx = mn.x - gate.x;
          const ry = mn.y - gate.y;
          mn.x = gate.x + rx * cF - ry * sF;
          mn.y = gate.y + rx * sF + ry * cF;
        }
      }
      console.log(`  ${gate.nodeId}: dist ${currentDist.toFixed(0)}→${TARGET_GATE_DIST}, rot ${((angle * 180) / Math.PI).toFixed(1)}°→FLIPPED ${((-angle * 180) / Math.PI).toFixed(1)}°, scale ${FIG_SCALE}`);
    } else {
      console.log(`  ${gate.nodeId}: dist ${currentDist.toFixed(0)}→${TARGET_GATE_DIST}, rot ${((angle * 180) / Math.PI).toFixed(1)}°, scale ${FIG_SCALE}`);
    }

    adjusted++;
  }
  console.log(`  Adjusted ${adjusted} outer-circle figures`);
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5c: Move s0-d1 figures (242 etc.) 2× closer to parent
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 5c: Move s0-d1 figures closer ===");
{
  const figNodeSet5c = new Set(figMembership.map(([nid]: [number, number]) => nid));
  const s0Suffix = "fig-tendril-s0-d1-gate";

  for (const cls of ["samurai", "warrior", "mage", "archer"] as const) {
    const gate = nodeByNodeId(`${cls}-${s0Suffix}`);
    if (!gate) continue;

    // Tree parent
    const treeParents = gate.connections.filter((c: number) => !figNodeSet5c.has(c));
    if (treeParents.length === 0) continue;
    const parentId = treeParents[0];
    const parent = nodeById(parentId);
    if (!parent) continue;

    // Get figure members
    const gateEntry = figMembership.find(([nid]: [number, number]) => nid === gate.id);
    const figId = gateEntry ? gateEntry[1] : -1;
    const figMembers = figId >= 0
      ? figMembership.filter(([, fid]: [number, number]) => fid === figId).map(([nid]: [number, number]) => nid)
      : [gate.id];

    // Halve the distance (but skip if already ≤ 70)
    const dx = gate.x - parent.x;
    const dy = gate.y - parent.y;
    const currentDist = Math.sqrt(dx * dx + dy * dy);
    if (currentDist <= 70) {
      console.log(`  ${cls}: ${gate.nodeId} dist ${currentDist.toFixed(0)} already close, skip`);
      continue;
    }
    const targetDist = currentDist / 2;
    const dirX = dx / currentDist;
    const dirY = dy / currentDist;
    const newGateX = parent.x + dirX * targetDist;
    const newGateY = parent.y + dirY * targetDist;
    const shiftX = newGateX - gate.x;
    const shiftY = newGateY - gate.y;

    // Shift + scale figure by 0.75 to avoid overlaps
    const S0_SCALE = 0.75;
    for (const mid of figMembers) {
      const mn = nodeById(mid);
      if (mn) {
        mn.x += shiftX;
        mn.y += shiftY;
        if (mid !== gate.id) {
          mn.x = gate.x + shiftX + (mn.x - gate.x - shiftX) * S0_SCALE;
          mn.y = gate.y + shiftY + (mn.y - gate.y - shiftY) * S0_SCALE;
        }
      }
    }

    console.log(`  ${cls}: ${gate.nodeId} dist ${currentDist.toFixed(0)}→${targetDist.toFixed(0)}, scale ${S0_SCALE} (parent=${parent.nodeId})`);
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5d: Replace s0-d1 figures with pentagon + inner triangle
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 5d: Replace s0-d1 figures (pentagon+triangle) ===");
{
  const CX = 800, CY = 800;
  const R_PENT = 55; // pentagon radius (2.5× original 22)
  const R_TRI = 25;  // inner triangle radius (2.5× original 10)
  const GATE_TO_P0 = 12; // distance from gate to nearest pentagon vertex
  let nextId5d = Math.max(...nodes.map(n => n.id)) + 1;
  const figNodeSet5d = new Set(figMembership.map(([nid]: [number, number]) => nid));

  for (const cls of ["samurai", "warrior", "mage", "archer"] as const) {
    const gate = nodeByNodeId(`${cls}-fig-tendril-s0-d1-gate`);
    if (!gate) continue;

    // Find figure ID
    const gateEntry = figMembership.find(([nid]: [number, number]) => nid === gate.id);
    const figId = gateEntry ? gateEntry[1] : -1;
    if (figId < 0) continue;

    // Get all figure members
    const allMembers = figMembership
      .filter(([, fid]: [number, number]) => fid === figId)
      .map(([nid]: [number, number]) => nid);

    // Delete all non-gate keystones
    const keystones = allMembers.filter((id: number) => id !== gate.id);
    for (const ksId of keystones) {
      deleteNode(ksId);
    }
    console.log(`  ${cls}: deleted ${keystones.length} old keystones`);

    // Compute tangent direction for figure orientation
    const treeParents = gate.connections.filter((c: number) => !figNodeSet5d.has(c));
    const parentId = treeParents.length > 0 ? treeParents[0] : -1;
    const parent = parentId >= 0 ? nodeById(parentId) : null;

    // Direction: from parent through gate (away from parent)
    let dirX = 0, dirY = -1; // default: upward
    if (parent) {
      const dpx = gate.x - parent.x;
      const dpy = gate.y - parent.y;
      const dpLen = Math.sqrt(dpx * dpx + dpy * dpy);
      if (dpLen > 0) { dirX = dpx / dpLen; dirY = dpy / dpLen; }
    }

    // Figure center
    const cx = gate.x + dirX * (GATE_TO_P0 + R_PENT);
    const cy = gate.y + dirY * (GATE_TO_P0 + R_PENT);

    // Base angle: direction from C back toward gate
    const baseAngle = Math.atan2(gate.y - cy, gate.x - cx);

    // Pentagon vertices (P0 closest to gate, then CCW)
    const pentIds: number[] = [];
    for (let k = 0; k < 5; k++) {
      const a = baseAngle + k * (2 * Math.PI / 5);
      const px = Math.round(cx + R_PENT * Math.cos(a));
      const py = Math.round(cy + R_PENT * Math.sin(a));
      const id = nextId5d++;
      const pType = k === 0 ? "figureEntry" : "keystone"; // P0 becomes entry point
      nodes.push({
        id, nodeId: `${cls}-s0fig-p${k}`, type: pType as any, classAffinity: cls,
        x: px, y: py, label: "", name: null, stat: null, value: 0,
        defId: null, mods: [], connections: [], connector: false,
      });
      pentIds.push(id);
      figMembership.push([id, figId]);
    }

    // Triangle vertices (T0-T2, offset 60° from base)
    const triIds: number[] = [];
    for (let j = 0; j < 3; j++) {
      const a = baseAngle + Math.PI / 3 + j * (2 * Math.PI / 3);
      const tx = Math.round(cx + R_TRI * Math.cos(a));
      const ty = Math.round(cy + R_TRI * Math.sin(a));
      const id = nextId5d++;
      nodes.push({
        id, nodeId: `${cls}-s0fig-t${j}`, type: "keystone" as any, classAffinity: cls,
        x: tx, y: ty, label: "", name: null, stat: null, value: 0,
        defId: null, mods: [], connections: [], connector: false,
      });
      triIds.push(id);
      figMembership.push([id, figId]);
    }

    // Pentagon ring edges: P0-P1-P2-P3-P4-P0
    for (let k = 0; k < 5; k++) {
      const a = pentIds[k], b = pentIds[(k + 1) % 5];
      addEdge(a, b);
      figEdges.push(`${a}-${b}`);
    }

    // Triangle ring edges: T0-T1-T2-T0
    for (let j = 0; j < 3; j++) {
      const a = triIds[j], b = triIds[(j + 1) % 3];
      addEdge(a, b);
      figEdges.push(`${a}-${b}`);
    }

    // Cross edge: P3-T1 only (removed P1-T0 and P0-T2 per user request)
    addEdge(pentIds[3], triIds[1]);
    figEdges.push(`${pentIds[3]}-${triIds[1]}`);

    // Delete gate, connect parent directly to P0
    const parentConns = gate.connections.filter((c: number) => c !== pentIds[0] && !figNodeSet5d.has(c));
    deleteNode(gate.id);
    for (const pc of parentConns) {
      addEdge(pc, pentIds[0]);
    }

    console.log(`  ${cls}: created pentagon[${pentIds}] + triangle[${triIds}], deleted gate, parent↔P0`);
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5e: Flip specific figures (additional rotation)
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 5e: Flip specific figures ===");
{
  // Flip samurai-fig-tendril-m1L-d1-gate (132) → rotate 180° to face right
  // Flip archer-fig-tendril-m0L-d1-gate (335) → rotate 180° to face left
  const toFlip = [
    "samurai-fig-tendril-m1L-d1-gate",
    "archer-fig-tendril-m0L-d1-gate",
  ];

  for (const gateNodeId of toFlip) {
    const gate = nodeByNodeId(gateNodeId);
    if (!gate) continue;

    const gateEntry = figMembership.find(([nid]: [number, number]) => nid === gate.id);
    const figId = gateEntry ? gateEntry[1] : -1;
    const figMembers = figId >= 0
      ? figMembership.filter(([, fid]: [number, number]) => fid === figId).map(([nid]: [number, number]) => nid)
      : [];

    // Rotate 180° around gate
    for (const mid of figMembers) {
      if (mid === gate.id) continue;
      const mn = nodeById(mid);
      if (mn) {
        mn.x = 2 * gate.x - mn.x;
        mn.y = 2 * gate.y - mn.y;
      }
    }
    console.log(`  Flipped ${gateNodeId} (fig ${figId}, ${figMembers.length} members) 180°`);
  }

  // Rotate archer-s0fig by 90° CW around P0 to avoid crossing with nearby tendril edge
  const archerS0P0 = nodeByNodeId("archer-s0fig-p0");
  if (archerS0P0) {
    const ge = figMembership.find(([nid]: [number, number]) => nid === archerS0P0.id);
    const fid = ge ? ge[1] : -1;
    const members = fid >= 0
      ? figMembership.filter(([, f]: [number, number]) => f === fid).map(([n]: [number, number]) => n)
      : [];
    const ang = -Math.PI / 2; // -90° (CW)
    const cosR = Math.cos(ang), sinR = Math.sin(ang);
    for (const mid of members) {
      if (mid === archerS0P0.id) continue;
      const mn = nodeById(mid);
      if (mn) {
        const rx = mn.x - archerS0P0.x;
        const ry = mn.y - archerS0P0.y;
        mn.x = archerS0P0.x + rx * cosR - ry * sinR;
        mn.y = archerS0P0.y + rx * sinR + ry * cosR;
      }
    }
    console.log(`  Rotated archer-s0fig -90° around P0 to avoid crossing`);
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5f: Shorten archer-s1-d1 figure (371↔111) by 2× + rotate -45°
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 5f: Shorten & rotate archer-s1-d1 figure ===");
{
  // 371 = archer-fig-tendril-s1-d1-gate, 111 = archer-branch-4 (parent)
  // Current distance ~104, halve to ~52, and rotate figure up-left by 45°
  const gate = nodeByNodeId("archer-fig-tendril-s1-d1-gate");
  const parent = nodeByNodeId("archer-branch-4");
  if (gate && parent) {
    // Collect figure members
    const gateEntry = figMembership.find(([nid]: [number, number]) => nid === gate.id);
    const figId = gateEntry ? gateEntry[1] : -1;
    const figMembers = figId >= 0
      ? figMembership.filter(([, fid]: [number, number]) => fid === figId).map(([nid]: [number, number]) => nid)
      : [];

    // 1. Shorten gate-to-parent distance by 2×
    const dx = gate.x - parent.x;
    const dy = gate.y - parent.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const newDist = dist / 2;
    const ratio = newDist / dist;
    // New gate position: move halfway toward parent
    const newGX = parent.x + dx * ratio;
    const newGY = parent.y + dy * ratio;
    const shiftX = newGX - gate.x;
    const shiftY = newGY - gate.y;

    // Shift all figure members by the same offset
    for (const mid of figMembers) {
      const mn = nodeById(mid);
      if (mn) {
        mn.x += shiftX;
        mn.y += shiftY;
      }
    }

    // 2. Rotate figure -45° (up-left) around gate
    const ang = -Math.PI / 4; // -45°
    const cosR = Math.cos(ang), sinR = Math.sin(ang);
    for (const mid of figMembers) {
      if (mid === gate.id) continue;
      const mn = nodeById(mid);
      if (mn) {
        const rx = mn.x - newGX;
        const ry = mn.y - newGY;
        mn.x = newGX + rx * cosR - ry * sinR;
        mn.y = newGY + rx * sinR + ry * cosR;
      }
    }

    console.log(`  Shortened ${gate.nodeId}↔${parent.nodeId} from ${dist.toFixed(1)} to ${newDist.toFixed(1)}`);
    console.log(`  Rotated figure -45° (${figMembers.length} members)`);
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5g: Make archer-bfig-1 (421) symmetrical
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 5g: Make archer-bfig-1 symmetrical ===");
{
  // Bowtie figure: gate + left triangle (ks0,ks2) + right triangle (ks4,ks5)
  // Mirror left pair across the perpendicular bisector to get symmetric right pair
  // Use centroid-to-centroid direction as the left-right axis

  const gate = nodeByNodeId("archer-fig-bfig-1-gate");
  if (gate) {
    const ks0 = nodeByNodeId("archer-fig-bfig-1-ks0");
    const ks2 = nodeByNodeId("archer-fig-bfig-1-ks2");
    const ks4 = nodeByNodeId("archer-fig-bfig-1-ks4");
    const ks5 = nodeByNodeId("archer-fig-bfig-1-ks5");

    if (ks0 && ks2 && ks4 && ks5) {
      // Direction from left centroid to right centroid
      const leftCx = (ks0.x + ks2.x) / 2;
      const leftCy = (ks0.y + ks2.y) / 2;
      const rightCx = (ks4.x + ks5.x) / 2;
      const rightCy = (ks4.y + ks5.y) / 2;
      const dLRx = rightCx - leftCx;
      const dLRy = rightCy - leftCy;
      const dLRlen = Math.sqrt(dLRx * dLRx + dLRy * dLRy);
      const nx = dLRx / dLRlen;
      const ny = dLRy / dLRlen;

      // Reflect left nodes across plane perpendicular to LR-direction through gate
      const leftNodes = [ks0, ks2];
      const rightNodes = [ks4, ks5];

      for (let i = 0; i < leftNodes.length; i++) {
        const ln = leftNodes[i];
        const rn = rightNodes[i];
        const offX = ln.x - gate.x;
        const offY = ln.y - gate.y;
        // Project offset onto LR direction
        const proj = offX * nx + offY * ny;
        // Reflect: negate LR component, keep perpendicular component
        rn.x = gate.x + offX - 2 * proj * nx;
        rn.y = gate.y + offY - 2 * proj * ny;
        console.log(`  Mirrored ${rn.nodeId}: (${Math.round(rn.x)},${Math.round(rn.y)})`);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5h: Add start↔trunk-0 edges for warrior, mage, archer
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 5h: Add start↔trunk-0 for all classes ===");
{
  for (const cls of ["warrior", "mage", "archer"]) {
    const startNode = nodeByNodeId(`${cls}-start`);
    const trunk0 = nodeByNodeId(`${cls}-trunk-0`);
    if (startNode && trunk0) {
      addEdge(startNode.id, trunk0.id);
      console.log(`  Added edge ${cls}-start(${startNode.id})↔${cls}-trunk-0(${trunk0.id})`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5i: Reposition trunk-2 + reshape vweb-0 as slingshot
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 5i: Reposition trunk-2 + reshape vweb-0 ===");
{
  let nextId5i = Math.max(...nodes.map(n => n.id)) + 1;

  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    // --- Task 1: Move trunk-2 to midpoint(branch-2, web4e-n1) ---
    const trunk2 = nodeByNodeId(`${cls}-trunk-2`);
    const branch2 = nodeByNodeId(`${cls}-branch-2`);
    const web4eN1 = nodeByNodeId(`${cls}-web4e-n1`);
    if (trunk2 && branch2 && web4eN1) {
      const oldX = trunk2.x, oldY = trunk2.y;
      trunk2.x = (branch2.x + web4eN1.x) / 2;
      trunk2.y = (branch2.y + web4eN1.y) / 2;
      console.log(`  ${cls}: trunk-2 (${Math.round(oldX)},${Math.round(oldY)}) → (${Math.round(trunk2.x)},${Math.round(trunk2.y)})`);
    }

    // --- Tasks 2&3: Increase vweb-0 gap + reshape as slingshot ---
    const gate = nodeByNodeId(`${cls}-fig-vweb-0-gate`);
    const parentNode = nodeByNodeId(`${cls}-iweb-0`);
    if (!gate || !parentNode) continue;

    // Find figure ID and members
    const gateEntry = figMembership.find(([nid]: [number, number]) => nid === gate.id);
    const figId5i = gateEntry ? gateEntry[1] : -1;
    const figMembers5i = figId5i >= 0
      ? figMembership.filter(([, fid]: [number, number]) => fid === figId5i).map(([nid]: [number, number]) => nid)
      : [];

    // Delete old keystones (keep gate)
    const oldKs = figMembers5i.filter((m: number) => m !== gate.id);
    for (const ksId of oldKs) {
      deleteNode(ksId);
    }

    // Forward direction: fixed per class axis (strictly vertical/horizontal)
    // samurai=up, warrior=right, mage=down, archer=left
    const classFwd: Record<string, [number, number]> = {
      samurai: [0, -1], warrior: [1, 0], mage: [0, 1], archer: [-1, 0],
    };
    const [fwdX, fwdY] = classFwd[cls] || [0, -1];
    const perpX5i = -fwdY, perpY5i = fwdX;

    // Move gate along radial direction from parent (60px)
    const GATE_DIST = 60;
    gate.x = parentNode.x + fwdX * GATE_DIST;
    gate.y = parentNode.y + fwdY * GATE_DIST;

    // Slingshot: gate → handle → (fork_L, fork_R) → (tip_L, tip_R)
    const HANDLE_D = 30;
    const FORK_D = 25;
    const FORK_SPREAD = 25;
    const TIP_D = 25;
    const TIP_SPREAD = 15;

    const hx = gate.x + fwdX * HANDLE_D;
    const hy = gate.y + fwdY * HANDLE_D;

    const flx = hx + fwdX * FORK_D - perpX5i * FORK_SPREAD;
    const fly = hy + fwdY * FORK_D - perpY5i * FORK_SPREAD;
    const frx = hx + fwdX * FORK_D + perpX5i * FORK_SPREAD;
    const fry = hy + fwdY * FORK_D + perpY5i * FORK_SPREAD;

    const tlx = flx + fwdX * TIP_D - perpX5i * TIP_SPREAD;
    const tly = fly + fwdY * TIP_D - perpY5i * TIP_SPREAD;
    const trx = frx + fwdX * TIP_D + perpX5i * TIP_SPREAD;
    const try_ = fry + fwdY * TIP_D + perpY5i * TIP_SPREAD;

    // Create 5 new keystones
    const newDefs = [
      { suffix: "handle", x: hx, y: hy },
      { suffix: "fork-l", x: flx, y: fly },
      { suffix: "fork-r", x: frx, y: fry },
      { suffix: "tip-l", x: tlx, y: tly },
      { suffix: "tip-r", x: trx, y: try_ },
    ];

    const newIds5i: number[] = [];
    for (const nd of newDefs) {
      const id = nextId5i++;
      nodes.push({
        id,
        nodeId: `${cls}-fig-vweb-0-${nd.suffix}`,
        type: "keystone" as any,
        classAffinity: cls,
        x: Math.round(nd.x),
        y: Math.round(nd.y),
        label: "",
        name: null,
        stat: null,
        value: 0,
        defId: null,
        mods: [],
        connections: [],
        connector: false,
      });
      newIds5i.push(id);
      figMembership.push([id, figId5i]);
    }

    const [handleId, forkLId, forkRId, tipLId, tipRId] = newIds5i;

    // Edges: gate↔handle, handle↔forkL, handle↔forkR, forkL↔tipL, forkR↔tipR
    const slingEdges: [number, number][] = [
      [gate.id, handleId],
      [handleId, forkLId],
      [handleId, forkRId],
      [forkLId, tipLId],
      [forkRId, tipRId],
    ];

    for (const [a, b] of slingEdges) {
      addEdge(a, b);
      addFigureEdge(a, b);
    }

    console.log(`  ${cls}: vweb-0 → slingshot (6 nodes, gate dist=${GATE_DIST}px)`);
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5j: Scale figures + add new figures + notable nodes (all classes)
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 5j: Scale figures + add new nodes ===");
{
  let nextId5j = Math.max(...nodes.map(n => n.id)) + 1;
  let nextFigId5j = Math.max(...figMembership.map(([, fid]: [number, number]) => fid)) + 1;

  // ─── Task 1: Scale bfig-0 by 2× from gate ───
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const gate = nodeByNodeId(`${cls}-fig-bfig-0-gate`);
    if (!gate) continue;
    const gateEntry = figMembership.find(([nid]: [number, number]) => nid === gate.id);
    const figId = gateEntry ? gateEntry[1] : -1;
    if (figId < 0) continue;
    const members = figMembership
      .filter(([, fid]: [number, number]) => fid === figId)
      .map(([nid]: [number, number]) => nid);
    const SCALE = 1.5;
    let scaled = 0;
    for (const mid of members) {
      if (mid === gate.id) continue;
      const m = nodes.find(n => n.id === mid);
      if (!m) continue;
      m.x = Math.round(gate.x + (m.x - gate.x) * SCALE);
      m.y = Math.round(gate.y + (m.y - gate.y) * SCALE);
      scaled++;
    }
    // Remove bfig-0 keystone↔keystone edges that cross slingshot edges
    const slSuffixes = [["gate", "handle"], ["handle", "fork-l"], ["handle", "fork-r"], ["fork-l", "tip-l"], ["fork-r", "tip-r"]];
    const slEdgeNodes: [any, any][] = [];
    for (const [sa, sb] of slSuffixes) {
      const a5 = nodeByNodeId(`${cls}-fig-vweb-0-${sa}`);
      const b5 = nodeByNodeId(`${cls}-fig-vweb-0-${sb}`);
      if (a5 && b5) slEdgeNodes.push([a5, b5]);
    }
    const ksMembers = members.filter(mid => mid !== gate.id).map(mid => nodes.find(n => n.id === mid)).filter(Boolean) as any[];
    let removedEdges = 0;
    // Check each pair of keystones
    for (let i = 0; i < ksMembers.length; i++) {
      for (let j = i + 1; j < ksMembers.length; j++) {
        const ka = ksMembers[i], kb = ksMembers[j];
        if (!ka.connections.includes(kb.id)) continue;
        // Check if ka↔kb crosses any slingshot edge
        for (const [sA, sB] of slEdgeNodes) {
          if (segmentsCross(ka.x, ka.y, kb.x, kb.y, sA.x, sA.y, sB.x, sB.y)) {
            removeEdge(ka.id, kb.id);
            figEdges = figEdges.filter(e => {
              const [ea, eb] = e.split("-").map(Number);
              return !((ea === ka.id && eb === kb.id) || (ea === kb.id && eb === ka.id));
            });
            removedEdges++;
            break;
          }
        }
      }
    }
    console.log(`  ${cls}: bfig-0 scaled ${scaled} members by ${SCALE}×${removedEdges ? ` (removed ${removedEdges} crossing edges)` : ""}`);
  }

  // ─── Task 2: Enlarge web4eR 1.2× + rotate base horizontal ───
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const n1 = nodeByNodeId(`${cls}-web4eR-n1`);
    const n2 = nodeByNodeId(`${cls}-web4eR-n2`);
    const n3 = nodeByNodeId(`${cls}-web4eR-n3`);
    const n4 = nodeByNodeId(`${cls}-web4eR-n4`);
    if (!n1 || !n2 || !n3 || !n4) continue;
    const triNodes = [n1, n2, n3, n4];
    const cx5j = triNodes.reduce((s, n) => s + n.x, 0) / 4;
    const cy5j = triNodes.reduce((s, n) => s + n.y, 0) / 4;
    // Scale 1.2×
    for (const n of triNodes) {
      n.x = cx5j + (n.x - cx5j) * 1.2;
      n.y = cy5j + (n.y - cy5j) * 1.2;
    }
    // Rotate base (n2→n3) to target angle perpendicular to class axis
    const curAngle = Math.atan2(n3.y - n2.y, n3.x - n2.x);
    const baseAngles: Record<string, number> = {
      samurai: 0, warrior: Math.PI / 2, mage: Math.PI, archer: -Math.PI / 2,
    };
    const targetAngle = baseAngles[cls] ?? 0;
    const rot = targetAngle - curAngle;
    const cosR = Math.cos(rot), sinR = Math.sin(rot);
    for (const n of triNodes) {
      const dx5 = n.x - cx5j, dy5 = n.y - cy5j;
      n.x = Math.round(cx5j + dx5 * cosR - dy5 * sinR);
      n.y = Math.round(cy5j + dx5 * sinR + dy5 * cosR);
    }
    console.log(`  ${cls}: web4eR scaled 1.2× + rotated ${(rot * 180 / Math.PI).toFixed(1)}°`);
  }

  // ─── Task 3: Add figure from m0R-d1-s0 toward branch-1 ───
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const src3 = nodeByNodeId(`${cls}-tendril-m0R-d1-s0`);
    const tgt3 = nodeByNodeId(`${cls}-branch-1`);
    if (!src3 || !tgt3) continue;
    const dx3 = tgt3.x - src3.x, dy3 = tgt3.y - src3.y;
    const d3 = Math.sqrt(dx3 * dx3 + dy3 * dy3);
    const nx3 = dx3 / d3, ny3 = dy3 / d3;
    const px3 = -ny3, py3 = nx3;
    const GATE_D3 = 40, KS_D3 = 20, KS_SPREAD3 = 18, KS_TIP3 = 40;
    const figId3 = nextFigId5j++;
    const gx3 = src3.x + nx3 * GATE_D3, gy3 = src3.y + ny3 * GATE_D3;
    const gateId3 = nextId5j++;
    nodes.push({
      id: gateId3, nodeId: `${cls}-fig-m0Rfig-gate`, type: "figureEntry" as any,
      classAffinity: cls, x: Math.round(gx3), y: Math.round(gy3),
      label: "", name: null, stat: null, value: 0, defId: null, mods: [], connections: [], connector: false,
    });
    figMembership.push([gateId3, figId3]);
    // Diamond shape: gate → ks1(left), gate → ks2(right), ks1 → ks0(tip), ks2 → ks0(tip)
    const ksDefs3 = [
      { s: "ks0", x: gx3 + nx3 * KS_TIP3, y: gy3 + ny3 * KS_TIP3 },
      { s: "ks1", x: gx3 + nx3 * KS_D3 - px3 * KS_SPREAD3, y: gy3 + ny3 * KS_D3 - py3 * KS_SPREAD3 },
      { s: "ks2", x: gx3 + nx3 * KS_D3 + px3 * KS_SPREAD3, y: gy3 + ny3 * KS_D3 + py3 * KS_SPREAD3 },
    ];
    const ksIds3: number[] = [];
    for (const k of ksDefs3) {
      const id = nextId5j++;
      nodes.push({
        id, nodeId: `${cls}-fig-m0Rfig-${k.s}`, type: "keystone" as any,
        classAffinity: cls, x: Math.round(k.x), y: Math.round(k.y),
        label: "", name: null, stat: null, value: 0, defId: null, mods: [], connections: [], connector: false,
      });
      figMembership.push([id, figId3]);
      ksIds3.push(id);
    }
    addEdge(src3.id, gateId3);
    // Diamond edges: gate↔ks1, gate↔ks2, ks1↔ks0(tip), ks2↔ks0(tip)
    addEdge(gateId3, ksIds3[1]); addFigureEdge(gateId3, ksIds3[1]);
    addEdge(gateId3, ksIds3[2]); addFigureEdge(gateId3, ksIds3[2]);
    addEdge(ksIds3[1], ksIds3[0]); addFigureEdge(ksIds3[1], ksIds3[0]);
    addEdge(ksIds3[2], ksIds3[0]); addFigureEdge(ksIds3[2], ksIds3[0]);
    console.log(`  ${cls}: m0Rfig added (4 nodes diamond) from m0R-d1-s0 toward branch-1`);
  }

  // ─── Task 4: Add figure from branch-1 toward s0fig-p0 ───
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const src4 = nodeByNodeId(`${cls}-branch-1`);
    const tgt4 = nodeByNodeId(`${cls}-s0fig-p0`);
    if (!src4 || !tgt4) continue;
    const dx4 = tgt4.x - src4.x, dy4 = tgt4.y - src4.y;
    const d4 = Math.sqrt(dx4 * dx4 + dy4 * dy4);
    const nx4 = dx4 / d4, ny4 = dy4 / d4;
    const px4 = -ny4, py4 = nx4;
    const GATE_D4 = 50, KS_D4 = 20, KS_SPREAD4 = 18, KS_TIP4 = 40;
    const figId4 = nextFigId5j++;
    const gx4 = src4.x + nx4 * GATE_D4, gy4 = src4.y + ny4 * GATE_D4;
    const gateId4 = nextId5j++;
    nodes.push({
      id: gateId4, nodeId: `${cls}-fig-b1fig-gate`, type: "figureEntry" as any,
      classAffinity: cls, x: Math.round(gx4), y: Math.round(gy4),
      label: "", name: null, stat: null, value: 0, defId: null, mods: [], connections: [], connector: false,
    });
    figMembership.push([gateId4, figId4]);
    // Diamond shape: gate → ks1(left), gate → ks2(right), ks1 → ks0(tip), ks2 → ks0(tip)
    const ksDefs4 = [
      { s: "ks0", x: gx4 + nx4 * KS_TIP4, y: gy4 + ny4 * KS_TIP4 },
      { s: "ks1", x: gx4 + nx4 * KS_D4 - px4 * KS_SPREAD4, y: gy4 + ny4 * KS_D4 - py4 * KS_SPREAD4 },
      { s: "ks2", x: gx4 + nx4 * KS_D4 + px4 * KS_SPREAD4, y: gy4 + ny4 * KS_D4 + py4 * KS_SPREAD4 },
    ];
    const ksIds4: number[] = [];
    for (const k of ksDefs4) {
      const id = nextId5j++;
      nodes.push({
        id, nodeId: `${cls}-fig-b1fig-${k.s}`, type: "keystone" as any,
        classAffinity: cls, x: Math.round(k.x), y: Math.round(k.y),
        label: "", name: null, stat: null, value: 0, defId: null, mods: [], connections: [], connector: false,
      });
      figMembership.push([id, figId4]);
      ksIds4.push(id);
    }
    addEdge(src4.id, gateId4);
    // Diamond edges: gate↔ks1, gate↔ks2, ks1↔ks0(tip), ks2↔ks0(tip)
    addEdge(gateId4, ksIds4[1]); addFigureEdge(gateId4, ksIds4[1]);
    addEdge(gateId4, ksIds4[2]); addFigureEdge(gateId4, ksIds4[2]);
    addEdge(ksIds4[1], ksIds4[0]); addFigureEdge(ksIds4[1], ksIds4[0]);
    addEdge(ksIds4[2], ksIds4[0]); addFigureEdge(ksIds4[2], ksIds4[0]);
    console.log(`  ${cls}: b1fig added (4 nodes diamond) from branch-1 toward s0fig-p0`);
  }

  // ─── Task 5: Scale arc inter-class figures by 1.5× from gate ───
  const arcNames = [
    "arc-samurai-warrior", "arc-warrior-mage", "arc-mage-archer", "arc-archer-samurai",
  ];
  for (const arcName of arcNames) {
    const gate5 = nodeByNodeId(arcName);
    if (!gate5) continue;
    const gateEntry5 = figMembership.find(([nid]: [number, number]) => nid === gate5.id);
    const figId5 = gateEntry5 ? gateEntry5[1] : -1;
    let members5: number[] = [];
    if (figId5 >= 0) {
      members5 = figMembership
        .filter(([, fid]: [number, number]) => fid === figId5)
        .map(([nid]: [number, number]) => nid);
    } else {
      // Fallback: BFS from gate through keystones
      const visited5 = new Set<number>([gate5.id]);
      const queue5 = [...(nodes.find(n => n.id === gate5.id)?.connections ?? [])];
      while (queue5.length > 0) {
        const cid = queue5.shift()!;
        if (visited5.has(cid)) continue;
        const cn = nodes.find(n => n.id === cid);
        if (!cn || cn.type !== "keystone") continue;
        visited5.add(cid);
        for (const cc of cn.connections) {
          if (!visited5.has(cc)) queue5.push(cc);
        }
      }
      members5 = [...visited5];
    }
    const ARC_SCALE = 1.5;
    let scaled5 = 0;
    for (const mid of members5) {
      if (mid === gate5.id) continue;
      const m = nodes.find(n => n.id === mid);
      if (!m) continue;
      m.x = Math.round(gate5.x + (m.x - gate5.x) * ARC_SCALE);
      m.y = Math.round(gate5.y + (m.y - gate5.y) * ARC_SCALE);
      scaled5++;
    }
    console.log(`  ${arcName}: scaled ${scaled5} members by ${ARC_SCALE}×`);
  }

  // ─── Task 6: Add notable from branch-3 away from bfig-1-gate ───
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const src6 = nodeByNodeId(`${cls}-branch-3`);
    const away6 = nodeByNodeId(`${cls}-fig-bfig-1-gate`);
    if (!src6 || !away6) continue;
    // Direction: from away6 toward src6 (i.e. away from bfig-1-gate)
    const dx6 = src6.x - away6.x, dy6 = src6.y - away6.y;
    const d6 = Math.sqrt(dx6 * dx6 + dy6 * dy6);
    const nx6 = dx6 / d6, ny6 = dy6 / d6;
    const DIST6 = 50;
    const newId6 = nextId5j++;
    nodes.push({
      id: newId6, nodeId: `${cls}-branch-3b`, type: "notable" as any,
      classAffinity: cls, x: Math.round(src6.x + nx6 * DIST6), y: Math.round(src6.y + ny6 * DIST6),
      label: "", name: null, stat: null, value: 0, defId: null, mods: [], connections: [], connector: false,
    });
    addEdge(src6.id, newId6);
    console.log(`  ${cls}: added notable branch-3b away from bfig-1-gate`);
  }

  // ─── Task 7: Add notable from branch-4 toward web4e-center ───
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const src7 = nodeByNodeId(`${cls}-branch-4`);
    const tgt7 = nodeByNodeId(`${cls}-web4e-center`);
    if (!src7 || !tgt7) continue;
    const dx7 = tgt7.x - src7.x, dy7 = tgt7.y - src7.y;
    const d7 = Math.sqrt(dx7 * dx7 + dy7 * dy7);
    const nx7 = dx7 / d7, ny7 = dy7 / d7;
    const DIST7 = 50;
    const newId7 = nextId5j++;
    nodes.push({
      id: newId7, nodeId: `${cls}-branch-4b`, type: "notable" as any,
      classAffinity: cls, x: Math.round(src7.x + nx7 * DIST7), y: Math.round(src7.y + ny7 * DIST7),
      label: "", name: null, stat: null, value: 0, defId: null, mods: [], connections: [], connector: false,
    });
    addEdge(src7.id, newId7);
    console.log(`  ${cls}: added notable branch-4b toward web4e-center`);
  }

  // ─── Task 8: Add notable from trunk-0 toward iweb-0 ───
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const src8 = nodeByNodeId(`${cls}-trunk-0`);
    const tgt8 = nodeByNodeId(`${cls}-iweb-0`);
    if (!src8 || !tgt8) continue;
    const dx8 = tgt8.x - src8.x, dy8 = tgt8.y - src8.y;
    const d8 = Math.sqrt(dx8 * dx8 + dy8 * dy8);
    const nx8 = dx8 / d8, ny8 = dy8 / d8;
    const DIST8 = 50;
    const newId8 = nextId5j++;
    nodes.push({
      id: newId8, nodeId: `${cls}-trunk-0b`, type: "notable" as any,
      classAffinity: cls, x: Math.round(src8.x + nx8 * DIST8), y: Math.round(src8.y + ny8 * DIST8),
      label: "", name: null, stat: null, value: 0, defId: null, mods: [], connections: [], connector: false,
    });
    addEdge(src8.id, newId8);
    console.log(`  ${cls}: added notable trunk-0b toward iweb-0`);
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5k: User adjustments — move, rotate, reconnect, reshape
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 5k: User adjustments ===");
{
  const CX5k = 800, CY5k = 800;
  let nextId5k = Math.max(...nodes.map(n => n.id)) + 1;
  let nextFigId5k = Math.max(...figMembership.map(([, fid]: [number, number]) => fid)) + 1;
  const figNodeSet5k = new Set(figMembership.map(([nid]: [number, number]) => nid));

  // Helper: get figure members for a gate node
  function getFigMembers5k(gateId: number): number[] {
    const entry = figMembership.find(([nid]: [number, number]) => nid === gateId);
    const fid = entry ? entry[1] : -1;
    if (fid < 0) return [];
    return figMembership.filter(([, f]: [number, number]) => f === fid).map(([n]: [number, number]) => n);
  }

  // Helper: rotate members around pivot
  function rotateFigure5k(pivotId: number, members: number[], angleDeg: number) {
    const pivot = nodeById(pivotId);
    if (!pivot) return;
    const rad = angleDeg * Math.PI / 180;
    const c = Math.cos(rad), s = Math.sin(rad);
    for (const mid of members) {
      if (mid === pivotId) continue;
      const mn = nodeById(mid);
      if (!mn) continue;
      const rx = mn.x - pivot.x, ry = mn.y - pivot.y;
      mn.x = pivot.x + rx * c - ry * s;
      mn.y = pivot.y + rx * s + ry * c;
    }
  }

  // Helper: scale figure from gate
  function scaleFigure5k(gateId: number, members: number[], scale: number) {
    const gate = nodeById(gateId);
    if (!gate) return;
    for (const mid of members) {
      if (mid === gateId) continue;
      const mn = nodeById(mid);
      if (!mn) continue;
      mn.x = gate.x + (mn.x - gate.x) * scale;
      mn.y = gate.y + (mn.y - gate.y) * scale;
    }
  }

  // ─── 5k-1: Move iweb-0 10px "left" + shift attached vweb-0 figure (all classes) ───
  console.log("  5k-1: Move iweb-0 10px left + vweb-0 (all classes)");
  {
    // Class angles: samurai=0, warrior=π/2, mage=π, archer=3π/2
    // "Left" for samurai = (-10, 0). Rotate by class angle for mirror.
    const classAngles: Record<string, number> = {
      samurai: 0, warrior: Math.PI / 2, mage: Math.PI, archer: 3 * Math.PI / 2,
    };
    const SHIFT = -10; // base X shift for samurai

    for (const cls of ["samurai", "warrior", "mage", "archer"]) {
      const iweb = nodeByNodeId(`${cls}-iweb-0`);
      if (!iweb) continue;

      const angle = classAngles[cls];
      const dx = SHIFT * Math.cos(angle);
      const dy = SHIFT * Math.sin(angle);

      // Shift iweb-0
      iweb.x += dx;
      iweb.y += dy;

      // Shift attached vweb-0 figure (gate + all keystones)
      const vwebGate = nodeByNodeId(`${cls}-fig-vweb-0-gate`);
      if (vwebGate) {
        const vwebEntry = figMembership.find(([nid]: [number, number]) => nid === vwebGate.id);
        const vwebFigId = vwebEntry ? vwebEntry[1] : -1;
        const vwebMembers = vwebFigId >= 0
          ? figMembership.filter(([, fid]: [number, number]) => fid === vwebFigId).map(([nid]: [number, number]) => nid)
          : [];
        for (const mid of vwebMembers) {
          const mn = nodeById(mid);
          if (mn) { mn.x += dx; mn.y += dy; }
        }
        console.log(`    ${cls}: shifted iweb-0 + vweb-0 (${vwebMembers.length} members) by (${dx.toFixed(0)},${dy.toFixed(0)})`);
      } else {
        console.log(`    ${cls}: shifted iweb-0 by (${dx.toFixed(0)},${dy.toFixed(0)})`);
      }
    }
  }

  // ─── 5k-2: Place web4eR-n1 (481) aligned with trunk-3, 20px outward (all classes) ───
  console.log("  5k-2: Place web4eR at trunk-3 aligned, 20px outward (all classes)");
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const trunk3 = nodeByNodeId(`${cls}-trunk-3`);
    const n1 = nodeByNodeId(`${cls}-web4eR-n1`);
    const n2 = nodeByNodeId(`${cls}-web4eR-n2`);
    const n3 = nodeByNodeId(`${cls}-web4eR-n3`);
    const n4 = nodeByNodeId(`${cls}-web4eR-n4`);
    if (!trunk3 || !n1) continue;

    // Outward direction from center through trunk-3
    const radX = trunk3.x - CX5k;
    const radY = trunk3.y - CY5k;
    const radLen = Math.sqrt(radX * radX + radY * radY);
    const outX = radX / radLen;
    const outY = radY / radLen;

    // Target: same alignment as trunk-3 (perpendicular coord matches),
    // 20px outward along radial direction
    const targetX = trunk3.x + outX * 20;
    const targetY = trunk3.y + outY * 20;
    const shiftX = targetX - n1.x;
    const shiftY = targetY - n1.y;

    for (const n of [n1, n2, n3, n4]) {
      if (!n) continue;
      n.x += shiftX;
      n.y += shiftY;
    }
    console.log(`    ${cls}: web4eR n1 → (${targetX.toFixed(0)},${targetY.toFixed(0)}), shifted by (${shiftX.toFixed(0)},${shiftY.toFixed(0)})`);
  }

  // ─── 5k-3: Rotate bfig-0 figures by 15° (all classes) ───
  console.log("  5k-3: Rotate bfig-0 by 15° (all classes)");
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const gate = nodeByNodeId(`${cls}-fig-bfig-0-gate`);
    if (!gate) continue;
    const members = getFigMembers5k(gate.id);
    rotateFigure5k(gate.id, members, 15);
    console.log(`    ${cls}: rotated bfig-0 (${members.length} members) by 15°`);
  }

  // ─── 5k-4: Shrink archer bfig-0 (414) edges by 15% ───
  console.log("  5k-4: Shrink archer bfig-0 edges by 15%");
  {
    const gate = nodeByNodeId("archer-fig-bfig-0-gate");
    if (gate) {
      const members = getFigMembers5k(gate.id);
      scaleFigure5k(gate.id, members, 0.85);
      console.log(`    scaled ${members.length} members by 0.85`);
    }
  }

  // ─── 5k-5: Rotate archer s0fig (525) by 120° CW ───
  console.log("  5k-5: Rotate archer s0fig by 120° CW");
  {
    const p0 = nodeByNodeId("archer-s0fig-p0");
    if (p0) {
      const members = getFigMembers5k(p0.id);
      rotateFigure5k(p0.id, members, -120); // CW = negative
      console.log(`    rotated ${members.length} members by -120°`);
    }
  }

  // ─── 5k-6: Rotate m1R-d1 figures by 90° + shorten gate↔parent by 2× (skip samurai — reverted) ───
  console.log("  5k-6: Rotate tendril-m1R-d1 by 90° + shorten parent edge (warrior/mage/archer)");
  for (const cls of ["warrior", "mage", "archer"]) {
    const gate = nodeByNodeId(`${cls}-fig-tendril-m1R-d1-gate`);
    const parent = nodeByNodeId(`${cls}-tendril-m1R-d1-s0`);
    if (!gate || !parent) continue;

    // 1. Shorten gate↔parent distance by 2×
    const dx = gate.x - parent.x;
    const dy = gate.y - parent.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const newDist = dist / 2;
    const ratio = newDist / dist;
    const newGX = parent.x + dx * ratio;
    const newGY = parent.y + dy * ratio;
    const shiftX = newGX - gate.x;
    const shiftY = newGY - gate.y;

    const members = getFigMembers5k(gate.id);
    for (const mid of members) {
      const mn = nodeById(mid);
      if (mn) { mn.x += shiftX; mn.y += shiftY; }
    }

    // 2. Rotate 90° around gate
    rotateFigure5k(gate.id, members, 90);
    console.log(`    ${cls}: shortened ${dist.toFixed(0)}→${newDist.toFixed(0)}, rotated 90°`);
  }

  // ─── 5k-7: Move tendril-m2L-d1-s0 up-left, reconnect to ks5 instead of gate (all classes) ───
  console.log("  5k-7: Reconnect tendril-m2L-d1-s0 → ks5 instead of gate (all classes)");
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const tendril = nodeByNodeId(`${cls}-tendril-m2L-d1-s0`);
    const gate = nodeByNodeId(`${cls}-fig-tendril-m2L-d1-gate`);
    const ks5 = nodeByNodeId(`${cls}-fig-tendril-m2L-d1-ks5`);
    if (!tendril || !gate || !ks5) continue;

    // Move tendril toward ks5 (shift halfway)
    const dx = ks5.x - tendril.x;
    const dy = ks5.y - tendril.y;
    tendril.x += dx * 0.3;
    tendril.y += dy * 0.3;

    // Disconnect from gate, connect to ks5
    removeEdge(tendril.id, gate.id);
    addEdge(tendril.id, ks5.id);
    console.log(`    ${cls}: moved (${dx.toFixed(0)}*0.3, ${dy.toFixed(0)}*0.3), reconnected to ks5`);
  }

  // ─── 5k-8: Reconnect tendril-m0L-d1-s0 → ks4 instead of gate (skip warrior — keep gate) ───
  console.log("  5k-8: Reconnect tendril-m0L-d1-s0 → ks4 instead of gate (samurai/mage/archer)");
  for (const cls of ["samurai", "mage", "archer"]) {
    const tendril = nodeByNodeId(`${cls}-tendril-m0L-d1-s0`);
    const gate = nodeByNodeId(`${cls}-fig-tendril-m0L-d1-gate`);
    const ks4 = nodeByNodeId(`${cls}-fig-tendril-m0L-d1-ks4`);
    if (!tendril || !gate || !ks4) {
      // Some classes might not have this node (mage's was deleted)
      continue;
    }

    // Disconnect from gate, connect to ks4
    removeEdge(tendril.id, gate.id);
    addEdge(tendril.id, ks4.id);
    console.log(`    ${cls}: reconnected ${tendril.nodeId} to ks4 (${ks4.id})`);
  }

  // ─── 5k-9: Replace b1fig (569) with 4-node triangle layout, double edge lengths ───
  console.log("  5k-9: Replace b1fig with 4-node triangle (all classes)");
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const gate = nodeByNodeId(`${cls}-fig-b1fig-gate`);
    const branch1 = nodeByNodeId(`${cls}-branch-1`);
    if (!gate || !branch1) continue;

    // Find current figure members
    const gateEntry = figMembership.find(([nid]: [number, number]) => nid === gate.id);
    const figId = gateEntry ? gateEntry[1] : -1;
    const allMembers = figId >= 0
      ? figMembership.filter(([, fid]: [number, number]) => fid === figId).map(([nid]: [number, number]) => nid)
      : [];

    // Delete old keystones (keep gate = position 3)
    const oldKs = allMembers.filter((id: number) => id !== gate.id);
    for (const ksId of oldKs) {
      deleteNode(ksId);
    }

    // Direction from branch-1 to gate (outward)
    const dx = gate.x - branch1.x;
    const dy = gate.y - branch1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dirX = dx / dist, dirY = dy / dist;
    const perpX = -dirY, perpY = dirX;

    // Double the gate distance from branch-1
    const newGateX = branch1.x + dirX * dist * 2;
    const newGateY = branch1.y + dirY * dist * 2;
    const shiftX = newGateX - gate.x;
    const shiftY = newGateY - gate.y;
    gate.x = newGateX;
    gate.y = newGateY;

    // Layout (gate = position 3):
    //           2 (above-right)
    //  1 (left)           3 (gate, center-right)
    //           4 (below-right)
    //
    // Edges: 1↔2, 2↔3, 3↔4 (no 1↔3)
    // |2-3| = |1-3|

    const edgeLen = 50; // doubled base of ~25

    // Position 1: left of gate, same level
    const pos1 = { x: gate.x - perpX * edgeLen * 0.3 - dirX * edgeLen, y: gate.y - perpY * edgeLen * 0.3 - dirY * edgeLen };
    // Position 2: above-right (toward outward + perp)
    const pos2 = { x: gate.x + dirX * edgeLen * 0.5 + perpX * edgeLen * 0.7, y: gate.y + dirY * edgeLen * 0.5 + perpY * edgeLen * 0.7 };
    // Position 4: below-right (toward outward - perp)
    const pos4 = { x: gate.x + dirX * edgeLen * 0.5 - perpX * edgeLen * 0.7, y: gate.y + dirY * edgeLen * 0.5 - perpY * edgeLen * 0.7 };

    const node1Id = nextId5k++;
    const node2Id = nextId5k++;
    const node4Id = nextId5k++;

    for (const [id, suffix, pos] of [
      [node1Id, "ks-a", pos1],
      [node2Id, "ks-b", pos2],
      [node4Id, "ks-c", pos4],
    ] as [number, string, {x:number,y:number}][]) {
      nodes.push({
        id, nodeId: `${cls}-fig-b1fig-${suffix}`, type: "keystone" as any,
        classAffinity: cls, x: Math.round(pos.x), y: Math.round(pos.y),
        label: "", name: null, stat: null, value: 0,
        defId: null, mods: [], connections: [], connector: false,
      });
      figMembership.push([id, figId]);
    }

    // Edges: 1↔2, 2↔3(gate), 3(gate)↔4
    addEdge(node1Id, node2Id); addFigureEdge(node1Id, node2Id);
    addEdge(node2Id, gate.id); addFigureEdge(node2Id, gate.id);
    addEdge(gate.id, node4Id); addFigureEdge(gate.id, node4Id);

    console.log(`    ${cls}: replaced b1fig with triangle [${node1Id},${node2Id},gate(${gate.id}),${node4Id}]`);
  }

  // ─── 5k-10: Replace m0Rfig (553) with sideways S shape ───
  console.log("  5k-10: Replace m0Rfig with sideways S shape (all classes)");
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const gate = nodeByNodeId(`${cls}-fig-m0Rfig-gate`);
    if (!gate) continue;

    // Find figure members
    const gateEntry = figMembership.find(([nid]: [number, number]) => nid === gate.id);
    const figId = gateEntry ? gateEntry[1] : -1;
    const allMembers = figId >= 0
      ? figMembership.filter(([, fid]: [number, number]) => fid === figId).map(([nid]: [number, number]) => nid)
      : [];

    // Delete old keystones
    const oldKs = allMembers.filter((id: number) => id !== gate.id);
    for (const ksId of oldKs) {
      deleteNode(ksId);
    }

    // Find tree parent to determine direction
    const treeParent = gate.connections.find((c: number) => !figNodeSet5k.has(c));
    const parent = treeParent !== undefined ? nodeById(treeParent) : null;

    let dirX = 0, dirY = -1;
    if (parent) {
      const dpx = gate.x - parent.x, dpy = gate.y - parent.y;
      const dpLen = Math.sqrt(dpx * dpx + dpy * dpy);
      if (dpLen > 0) { dirX = dpx / dpLen; dirY = dpy / dpLen; }
    }
    const perpX = -dirY, perpY = dirX;

    // Sideways S shape (6 keystones):
    //   gate → a → b
    //              |
    //         d ← c
    //         |
    //         e
    const S = 25;
    const positions = [
      { suffix: "s-a", x: gate.x + dirX * S,                    y: gate.y + dirY * S },
      { suffix: "s-b", x: gate.x + dirX * S + perpX * S,        y: gate.y + dirY * S + perpY * S },
      { suffix: "s-c", x: gate.x + dirX * S * 2 + perpX * S,    y: gate.y + dirY * S * 2 + perpY * S },
      { suffix: "s-d", x: gate.x + dirX * S * 2,                y: gate.y + dirY * S * 2 },
      { suffix: "s-e", x: gate.x + dirX * S * 3,                y: gate.y + dirY * S * 3 },
    ];

    const newIds: number[] = [];
    for (const p of positions) {
      const id = nextId5k++;
      nodes.push({
        id, nodeId: `${cls}-fig-m0Rfig-${p.suffix}`, type: "keystone" as any,
        classAffinity: cls, x: Math.round(p.x), y: Math.round(p.y),
        label: "", name: null, stat: null, value: 0,
        defId: null, mods: [], connections: [], connector: false,
      });
      figMembership.push([id, figId]);
      newIds.push(id);
    }

    const [aId, bId, cId, dId, eId] = newIds;
    // S-path: gate→a, a→b, b→c, c→d, d→e
    const sEdges: [number, number][] = [
      [gate.id, aId], [aId, bId], [bId, cId], [cId, dId], [dId, eId],
    ];
    for (const [a, b] of sEdges) {
      addEdge(a, b);
      addFigureEdge(a, b);
    }

    console.log(`    ${cls}: replaced m0Rfig with S-shape (5 keystones)`);
  }

  // ─── 5k-11: Reorient b1fig along bisector of angle at branch-1 in triangle (m0-d2-s1, branch-1, trunk-0) ───
  // 93→557 = bisector; triangle tip (ks-c) toward midpoint(112,76); remove gate↔ks-c, add ks-c↔ks-a + ks-c↔ks-b
  console.log("  5k-11: Reorient b1fig along bisector (all classes)");
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const gate = nodeByNodeId(`${cls}-fig-b1fig-gate`);
    const ksA = nodeByNodeId(`${cls}-fig-b1fig-ks-a`);
    const ksB = nodeByNodeId(`${cls}-fig-b1fig-ks-b`);
    const ksC = nodeByNodeId(`${cls}-fig-b1fig-ks-c`);
    const branch1 = nodeByNodeId(`${cls}-branch-1`);
    const m0d2s1 = nodeByNodeId(`${cls}-tendril-m0-d2-s1`);
    const trunk0 = nodeByNodeId(`${cls}-trunk-0`);
    if (!gate || !ksA || !ksB || !branch1 || !m0d2s1 || !trunk0) continue;

    // Bisector direction: from branch-1 toward midpoint(m0-d2-s1, trunk-0)
    const midpX = (m0d2s1.x + trunk0.x) / 2;
    const midpY = (m0d2s1.y + trunk0.y) / 2;
    const bisX = midpX - branch1.x;
    const bisY = midpY - branch1.y;
    const bisLen = Math.sqrt(bisX * bisX + bisY * bisY);
    const dirX = bisX / bisLen, dirY = bisY / bisLen;
    const perpX = -dirY, perpY = dirX;

    // Keep gate at current distance from branch-1 but along bisector
    const curDx = gate.x - branch1.x;
    const curDy = gate.y - branch1.y;
    const curDist = Math.sqrt(curDx * curDx + curDy * curDy);
    const oldGX = gate.x, oldGY = gate.y;
    gate.x = branch1.x + dirX * curDist;
    gate.y = branch1.y + dirY * curDist;

    // Redistribute keystones: ks-a and ks-b perpendicular, ks-c along bisector (triangle tip)
    const SPREAD = 40;
    ksA.x = gate.x + perpX * SPREAD;
    ksA.y = gate.y + perpY * SPREAD;
    ksB.x = gate.x - perpX * SPREAD;
    ksB.y = gate.y - perpY * SPREAD;

    if (ksC) {
      ksC.x = gate.x + dirX * SPREAD;
      ksC.y = gate.y + dirY * SPREAD;

      // Remove edge gate↔ks-c, add edges ks-c↔ks-a and ks-c↔ks-b
      removeEdge(gate.id, ksC.id);
      removeFigureEdge(gate.id, ksC.id);
      addEdge(ksC.id, ksA.id);
      addFigureEdge(ksC.id, ksA.id);
      addEdge(ksC.id, ksB.id);
      addFigureEdge(ksC.id, ksB.id);
    }

    console.log(`    ${cls}: gate (${oldGX.toFixed(0)},${oldGY.toFixed(0)}) → (${gate.x.toFixed(0)},${gate.y.toFixed(0)}), bisector toward (${midpX.toFixed(0)},${midpY.toFixed(0)})`);
  }

  // ─── 5k-12: Drop s0fig (525) 50px down + reconnect 107↔528 instead of 107↔525 (all classes) ───
  console.log("  5k-12: Drop s0fig 50px outward + reconnect parent→p3 (all classes)");
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const p0 = nodeByNodeId(`${cls}-s0fig-p0`);
    if (!p0) continue;

    // Get figure members
    const p0Entry = figMembership.find(([nid]: [number, number]) => nid === p0.id);
    const figId = p0Entry ? p0Entry[1] : -1;
    const members = figId >= 0
      ? figMembership.filter(([, fid]: [number, number]) => fid === figId).map(([nid]: [number, number]) => nid)
      : [];

    // Outward direction from center through p0 (for "down" = outward)
    const radX = p0.x - CX5k;
    const radY = p0.y - CY5k;
    const radLen = Math.sqrt(radX * radX + radY * radY);
    const outX = radX / radLen;
    const outY = radY / radLen;

    // Shift entire figure 50px outward
    for (const mid of members) {
      const mn = nodeById(mid);
      if (mn) {
        mn.x += outX * 50;
        mn.y += outY * 50;
      }
    }

    // Find p3 node (the one connected to p0 that forms the pentagon ring)
    const p3 = nodeByNodeId(`${cls}-s0fig-p3`);
    if (!p3) continue;

    // Find the tree parent connected to p0 (non-figure connection)
    const figNodeSetLocal = new Set(members);
    const treeParents = p0.connections.filter((c: number) => !figNodeSetLocal.has(c));

    for (const parentId of treeParents) {
      // Disconnect parent from p0, connect to p3
      removeEdge(parentId, p0.id);
      addEdge(parentId, p3.id);
      const parent = nodeById(parentId);
      console.log(`    ${cls}: dropped 50px outward, reconnected ${parent?.nodeId || parentId}→p3(${p3.id})`);
    }
  }

  // ─── 5k-13: Reconnect branch-0 → s0fig-p0 instead of s0fig-p3 (all classes) ───
  console.log("  5k-13: Reconnect branch-0 → s0fig-p0 instead of p3 (all classes)");
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const branch0 = nodeByNodeId(`${cls}-branch-0`);
    const p0 = nodeByNodeId(`${cls}-s0fig-p0`);
    const p3 = nodeByNodeId(`${cls}-s0fig-p3`);
    if (!branch0 || !p0 || !p3) continue;

    removeEdge(branch0.id, p3.id);
    addEdge(branch0.id, p0.id);
    console.log(`    ${cls}: branch-0(${branch0.id}) disconnected from p3(${p3.id}), connected to p0(${p0.id})`);
  }

  // ─── 5k-14: Shift archer s0fig so p3 goes to p4 position (archer only) ───
  console.log("  5k-14: Shift archer s0fig: p3 → p4 position");
  {
    const p3 = nodeByNodeId("archer-s0fig-p3");
    const p4 = nodeByNodeId("archer-s0fig-p4");
    if (p3 && p4) {
      const dx = p4.x - p3.x;
      const dy = p4.y - p3.y;
      const members = getFigMembers5k(p3.id);
      for (const mid of members) {
        const mn = nodeById(mid);
        if (mn) { mn.x += dx; mn.y += dy; }
      }
      console.log(`    shifted ${members.length} members by (${dx.toFixed(0)},${dy.toFixed(0)})`);
    }
  }

  // ─── 5k-15: Rotate mage m1R-d1 figure by 180° (mage only) ───
  console.log("  5k-15: Rotate mage m1R-d1 figure by 180°");
  {
    const gate = nodeByNodeId("mage-fig-tendril-m1R-d1-gate");
    if (gate) {
      const members = getFigMembers5k(gate.id);
      rotateFigure5k(gate.id, members, 180);
      console.log(`    rotated ${members.length} members by 180°`);
    }
  }

  // ─── 5k-16: Shorten vweb-0 (slingshot) gate↔iweb-0 edge ÷3 (all classes) ───
  console.log("  5k-16: Shorten vweb-0 slingshot edge ÷3 (all classes)");
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const gate = nodeByNodeId(`${cls}-fig-vweb-0-gate`);
    const iweb = nodeByNodeId(`${cls}-iweb-0`);
    if (!gate || !iweb) continue;

    const dx = gate.x - iweb.x;
    const dy = gate.y - iweb.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Shift figure closer to iweb: factor = 1/3 - 1 = -2/3
    const extraDx = dx * (-2 / 3);
    const extraDy = dy * (-2 / 3);

    const members = getFigMembers5k(gate.id);
    for (const mid of members) {
      const mn = nodeById(mid);
      if (mn) { mn.x += extraDx; mn.y += extraDy; }
    }
    console.log(`    ${cls}: dist ${dist.toFixed(0)}→${(dist / 3).toFixed(0)}, shifted ${members.length} members`);
  }

  // ─── 5k-17: Shift web4eR triangle 30↓10← then with trunk-3 all 30← (all classes) ───
  // For samurai: "down"=(0,+30), "left"=(-10,0), combined triangle=(-40,+30), trunk-3=(-30,0)
  // Rotate by class angle for other classes
  console.log("  5k-17: Shift web4eR triangle + trunk-3 (all classes)");
  {
    const classAngles5k17: Record<string, number> = {
      samurai: 0, warrior: Math.PI / 2, mage: Math.PI, archer: 3 * Math.PI / 2,
    };

    for (const cls of ["samurai", "warrior", "mage", "archer"]) {
      const angle = classAngles5k17[cls];
      const cosA = Math.cos(angle), sinA = Math.sin(angle);

      // Base shifts for samurai:
      // Triangle: 30 down(0,+30) + 10 left(-10,0) + 30 left(-30,0) = (-40, +30)
      const triBaseX = -40, triBaseY = 30;
      const triDx = triBaseX * cosA - triBaseY * sinA;
      const triDy = triBaseX * sinA + triBaseY * cosA;

      // Trunk-3: 30 left(-30, 0)
      const t3BaseX = -30, t3BaseY = 0;
      const t3Dx = t3BaseX * cosA - t3BaseY * sinA;
      const t3Dy = t3BaseX * sinA + t3BaseY * cosA;

      // Shift triangle nodes (web4eR: n1, n2, n3, n4)
      for (const suffix of ["n1", "n2", "n3", "n4"]) {
        const n = nodeByNodeId(`${cls}-web4eR-${suffix}`);
        if (n) { n.x += triDx; n.y += triDy; }
      }

      // Shift trunk-3
      const trunk3 = nodeByNodeId(`${cls}-trunk-3`);
      if (trunk3) {
        trunk3.x += t3Dx;
        trunk3.y += t3Dy;
      }

      console.log(`    ${cls}: triangle shifted (${triDx.toFixed(0)},${triDy.toFixed(0)}), trunk-3 shifted (${t3Dx.toFixed(0)},${t3Dy.toFixed(0)})`);
    }
  }

  // ─── 5k-18: Rotate m1R-d1 figure by 180° around gate (all classes) ───
  console.log("  5k-18: Rotate m1R-d1 figure by 180° (all classes)");
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const gate = nodeByNodeId(`${cls}-fig-tendril-m1R-d1-gate`);
    if (!gate) continue;
    const members = getFigMembers5k(gate.id);
    rotateFigure5k(gate.id, members, 180);
    console.log(`    ${cls}: rotated ${members.length} members by 180°`);
  }

  // ─── 5k-19: Delete m2R-d1-ks7 from figure (all classes that have it) ───
  console.log("  5k-19: Delete tendril-m2R-d1-ks7 (all classes)");
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const ks7 = nodeByNodeId(`${cls}-fig-tendril-m2R-d1-ks7`);
    if (!ks7) { console.log(`    ${cls}: not found, skipping`); continue; }

    // Reconnect neighbors (ks7 has 2 connections within the figure)
    const conns = [...ks7.connections];
    if (conns.length === 2) {
      deleteNodeAndReconnect(ks7.id, conns[0], conns[1]);
      // Also fix figure edges: remove old, add new
      removeFigureEdge(ks7.id, conns[0]);
      removeFigureEdge(ks7.id, conns[1]);
      addFigureEdge(conns[0], conns[1]);
    } else {
      deleteNode(ks7.id);
    }
    // Remove from figMembership
    const fmIdx = figMembership.findIndex(([nid]: [number, number]) => nid === ks7.id);
    if (fmIdx >= 0) figMembership.splice(fmIdx, 1);
    console.log(`    ${cls}: deleted ks7 (${ks7.id}), reconnected [${conns}]`);
  }

  // ─── 5k-20: Align web4eR X with trunk-3, shift 10px inward (all classes) ───
  console.log("  5k-20: Align web4eR with trunk-3 + 10px inward (all classes)");
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const trunk3 = nodeByNodeId(`${cls}-trunk-3`);
    const n1 = nodeByNodeId(`${cls}-web4eR-n1`);
    if (!trunk3 || !n1) continue;

    let shiftX: number, shiftY: number;
    if (Math.abs(trunk3.x - CX5k) > Math.abs(trunk3.y - CY5k)) {
      // Horizontal layout (warrior/archer) — align Y, shift X toward center
      shiftY = trunk3.y - n1.y;
      shiftX = Math.sign(CX5k - trunk3.x) * 10;
    } else {
      // Vertical layout (samurai/mage) — align X, shift Y toward center
      shiftX = trunk3.x - n1.x;
      shiftY = Math.sign(CY5k - trunk3.y) * 10;
    }

    for (const suffix of ["n1", "n2", "n3", "n4"]) {
      const n = nodeByNodeId(`${cls}-web4eR-${suffix}`);
      if (n) { n.x += shiftX; n.y += shiftY; }
    }
    console.log(`    ${cls}: shifted web4eR by (${shiftX.toFixed(0)},${shiftY.toFixed(0)})`);
  }

  // ─── 5k-21: Delete mage-branch-2 (node 104), reconnect neighbors ───
  console.log("  5k-21: Delete mage-branch-2");
  {
    const br2 = nodeByNodeId("mage-branch-2");
    if (br2 && br2.connections.length === 2) {
      deleteNodeAndReconnect(br2.id, br2.connections[0], br2.connections[1]);
      console.log(`    deleted mage-branch-2 (${br2.id}), reconnected [${br2.connections}]`);
    } else if (br2) {
      deleteNode(br2.id);
      console.log(`    deleted mage-branch-2 (${br2.id})`);
    }
  }

  // ─── 5k-22: Reconnect archer-branch-0 → s0fig-p3 instead of s0fig-p0 ───
  console.log("  5k-22: Reconnect archer-branch-0 → s0fig-p3 instead of p0");
  {
    const br0 = nodeByNodeId("archer-branch-0");
    const p0 = nodeByNodeId("archer-s0fig-p0");
    const p3 = nodeByNodeId("archer-s0fig-p3");
    if (br0 && p0 && p3) {
      removeEdge(br0.id, p0.id);
      addEdge(br0.id, p3.id);
      console.log(`    archer: branch-0(${br0.id}) → p3(${p3.id}) instead of p0(${p0.id})`);
    }
  }

  // ─── 5k-23: Replace 4 arc figures with class-specific shapes ───
  // samurai-warrior → sword, warrior-mage → shield, mage-archer → book, archer-samurai → bow
  console.log("  5k-23: Replace arc figures with class-specific shapes");
  {
    const S23 = 25;

    // Shape definitions: keystones, positions as [forward, lateral] × S23
    const SHAPES: Record<string, {
      positions: [number, number][]; // [forward, lateral]
      edges: [number, number][];     // keystone-to-keystone (0-indexed)
    }> = {
      shuriken: {
        // Shuriken (throwing star) — 8 nodes: 4 blade tips + 4 inner notches (no center)
        // Pure pinwheel cycle: inner→tip→next_inner CCW, closed loop
        // Node 0 = back inner (gate entry point)
        // Tips at 45°/135°/225°/315° (r≈2.5), inners at 0°/90°/180°/270° (r≈1.0)
        // 8 edges, zero self-crossings
        positions: [
          [1.5, 0],     // 0: back inner (180°) — gate connection
          [4.3, 1.8],   // 1: blade A tip (45°, upper-forward)
          [0.7, 1.8],   // 2: blade B tip (135°, upper-back)
          [0.7, -1.8],  // 3: blade C tip (225°, lower-back)
          [4.3, -1.8],  // 4: blade D tip (315°, lower-forward)
          [3.5, 0],     // 5: forward inner (0°)
          [2.5, 1.0],   // 6: upper inner (90°)
          [2.5, -1.0],  // 7: lower inner (270°)
        ],
        edges: [
          [5,1], [6,2], [0,3], [7,4],   // inner → nearest tip (trailing edge)
          [1,6], [2,0], [3,7], [4,5],   // tip → next inner CCW (swirl!)
        ],
      },
      shield: {
        // Shield shape — 8 keystones: wide top → narrow bottom point
        // User layout: 1---2 / 8(boss) / 3---4 / 5--6 / 7(point)
        // Connections: 1-8, 8-2, 2-4, 4-6, 6-7, 7-5, 3-5, 1-3
        positions: [
          [1, 0],       // 0: boss (8) — center, gate connection
          [0.5, 2],     // 1: top-left rim (1)
          [0.5, -2],    // 2: top-right rim (2)
          [2, 2],       // 3: mid-left (3) — same width as top
          [2, -2],      // 4: mid-right (4)
          [3.5, 1],     // 5: lower-left (5) — narrower
          [3.5, -1],    // 6: lower-right (6)
          [4.5, 0],     // 7: bottom point (7)
        ],
        edges: [[0,1], [0,2], [1,3], [2,4], [3,5], [4,6], [5,7], [6,7]],
      },
      book: {
        // Open book — 8 keystones: spine 3→5, pages spread out, 8/7 far edges
        // User layout: 1---2 / 3(spine) / 4---6 / 8--5--7
        // Connections: 1-3, 3-2, 2-6, 6-7, 5-6, 5-7, 3-5, 4-8, 8-5, 4-5, 1-4
        positions: [
          [1.5, 0],    // 0: spine top (3) — gate connection
          [0.5, 2],    // 1: upper-left page (1)
          [0.5, -2],   // 2: upper-right page (2)
          [3, 1.5],    // 3: lower-left page (4)
          [3.5, 0],    // 4: spine bottom (5)
          [3, -1.5],   // 5: lower-right page (6)
          [4, -2.5],   // 6: far right (7)
          [4, 2.5],    // 7: far left (8)
        ],
        edges: [[0,1], [0,2], [0,4], [1,3], [2,5], [3,4], [3,7], [4,5], [4,6], [4,7], [5,6]],
      },
      bow: {
        // Bow shape — 8 keystones: circular arc R≈4.62, from +60° to -60° (20° steps)
        // Circle center at origin, right half from x=2.31; tips at ±60°, grip at midpoint
        // Smooth arc path eliminates self-crossings
        positions: [
          [2.31, 0],     // 0: grip (8) — gate connection, midpoint of tips
          [2.31, 4.0],   // 1: upper limb tip (1) — +60°
          [3.54, 2.97],  // 2: upper curve (3) — +40°
          [4.34, 1.58],  // 3: upper-right (4) — +20°
          [4.62, 0],     // 4: rightmost (5) — 0° (string midpoint)
          [4.34, -1.58], // 5: lower-right (6) — -20°
          [3.54, -2.97], // 6: lower curve (7) — -40°
          [2.31, -4.0],  // 7: lower limb tip (2) — -60°
        ],
        edges: [[0,1], [1,2], [2,3], [3,4], [4,5], [5,6], [6,7], [7,0]],
      },
    };

    const arcConfigs = [
      { gateNodeId: "arc-samurai-warrior", shape: SHAPES.shuriken, prefix: "samurai-warrior-shuriken" },
      { gateNodeId: "arc-warrior-mage",    shape: SHAPES.shield, prefix: "warrior-mage-shield" },
      { gateNodeId: "arc-mage-archer",     shape: SHAPES.book,   prefix: "mage-archer-book" },
      { gateNodeId: "arc-archer-samurai",   shape: SHAPES.bow,    prefix: "archer-samurai-bow" },
    ];

    for (const { gateNodeId, shape, prefix } of arcConfigs) {
      const gate = nodeByNodeId(gateNodeId);
      if (!gate) continue;

      // Find figure members
      const gateEntry = figMembership.find(([nid]: [number, number]) => nid === gate.id);
      const figId = gateEntry ? gateEntry[1] : -1;
      const allMembers = figId >= 0
        ? figMembership.filter(([, fid]: [number, number]) => fid === figId).map(([nid]: [number, number]) => nid)
        : [];

      // Delete old keystones (keep gate)
      const oldKs = allMembers.filter((id: number) => id !== gate.id);
      for (const ksId of oldKs) {
        // Remove figure edges involving this keystone
        figEdges = figEdges.filter((e: string) => {
          const parts = e.split("-");
          return Number(parts[0]) !== ksId && Number(parts[1]) !== ksId;
        });
        deleteNode(ksId);
        const fmIdx = figMembership.findIndex(([nid]: [number, number]) => nid === ksId);
        if (fmIdx >= 0) figMembership.splice(fmIdx, 1);
      }

      // Direction from gate toward center
      const dx23 = CX5k - gate.x, dy23 = CY5k - gate.y;
      const len23 = Math.sqrt(dx23 * dx23 + dy23 * dy23);
      const dirX23 = dx23 / len23, dirY23 = dy23 / len23; // forward
      const perpX23 = -dirY23, perpY23 = dirX23;           // lateral

      // Create new keystones
      const newIds23: number[] = [];
      for (let i = 0; i < shape.positions.length; i++) {
        const [fwd, lat] = shape.positions[i];
        const id = nextId5k++;
        const x = gate.x + dirX23 * fwd * S23 + perpX23 * lat * S23;
        const y = gate.y + dirY23 * fwd * S23 + perpY23 * lat * S23;
        nodes.push({
          id, nodeId: `${prefix}-ks${i}`, type: "keystone" as any,
          classAffinity: gate.classAffinity, x: Math.round(x), y: Math.round(y),
          label: "", name: null, stat: null, value: 0,
          defId: null, mods: [], connections: [], connector: false,
        });
        figMembership.push([id, figId]);
        newIds23.push(id);
      }

      // Gate → first keystone
      addEdge(gate.id, newIds23[0]);
      addFigureEdge(gate.id, newIds23[0]);

      // Internal keystone edges
      for (const [a, b] of shape.edges) {
        addEdge(newIds23[a], newIds23[b]);
        addFigureEdge(newIds23[a], newIds23[b]);
      }

      console.log(`    ${gateNodeId}: replaced with ${prefix} (${shape.positions.length} keystones)`);
    }
  }

  // ─── 5k-24: Rotate shield 180° + reconnect gate→ks7 ───
  console.log("  5k-24: Rotate shield 180° + reconnect gate→ks7");
  {
    const gate = nodeByNodeId("arc-warrior-mage");
    if (gate) {
      const members = getFigMembers5k(gate.id);
      rotateFigure5k(gate.id, members, 180);
      // Reconnect gate from ks0 to ks7 (bottom point → now closest after rotation)
      const ks0 = nodeByNodeId("warrior-mage-shield-ks0");
      const ks7 = nodeByNodeId("warrior-mage-shield-ks7");
      if (ks0 && ks7) {
        removeEdge(gate.id, ks0.id);
        removeFigureEdge(gate.id, ks0.id);
        addEdge(gate.id, ks7.id);
        addFigureEdge(gate.id, ks7.id);
        console.log(`    reconnected gate→ks7(${ks7.id}) instead of ks0(${ks0.id})`);
      }
    }
  }

  // ─── 5k-25: Rotate book 180° + shift toward center + reconnect gate→ks4 ───
  console.log("  5k-25: Rotate book 180° + shift toward center + reconnect gate→ks4");
  {
    const gate = nodeByNodeId("arc-mage-archer");
    if (gate) {
      const members = getFigMembers5k(gate.id);
      rotateFigure5k(gate.id, members, 180);
      // Shift keystones (not gate) 75px toward center
      const dx25 = CX5k - gate.x, dy25 = CY5k - gate.y;
      const len25 = Math.sqrt(dx25 * dx25 + dy25 * dy25);
      const shiftFwd = 75; // 3 × 25px
      const shiftX = (dx25 / len25) * shiftFwd;
      const shiftY = (dy25 / len25) * shiftFwd;
      for (const mid of members) {
        if (mid === gate.id) continue;
        const mn = nodeById(mid);
        if (mn) { mn.x += shiftX; mn.y += shiftY; }
      }
      // Reconnect gate from ks0 to ks4 (spine bottom → closest after rotation+shift)
      const ks0 = nodeByNodeId("mage-archer-book-ks0");
      const ks4 = nodeByNodeId("mage-archer-book-ks4");
      if (ks0 && ks4) {
        removeEdge(gate.id, ks0.id);
        removeFigureEdge(gate.id, ks0.id);
        addEdge(gate.id, ks4.id);
        addFigureEdge(gate.id, ks4.id);
        console.log(`    reconnected gate→ks4(${ks4.id}) instead of ks0(${ks0.id})`);
      }
      console.log(`    shifted ${members.length - 1} keystones by (${shiftX.toFixed(0)},${shiftY.toFixed(0)})`);
    }
  }

  // ─── 5k-26: Shift all 4 arc figures 80px diagonally (away from overlaps) ───
  console.log("  5k-26: Shift arc figures 80px diagonally");
  {
    const D26 = 80 / Math.SQRT2; // ~56.57px per axis
    const shifts26: [string, number, number][] = [
      ["arc-samurai-warrior", -D26, +D26],  // katana → down-left
      ["arc-warrior-mage",    +D26, -D26],  // shield → up-right
      ["arc-mage-archer",     -D26, -D26],  // book → up-left
      ["arc-archer-samurai",  +D26, +D26],  // bow → down-right
    ];
    for (const [gateNodeId, dx26, dy26] of shifts26) {
      const gate = nodeByNodeId(gateNodeId);
      if (!gate) continue;
      const members = getFigMembers5k(gate.id);
      let count = 0;
      for (const mid of members) {
        if (mid === gate.id) continue;
        const mn = nodeById(mid);
        if (mn) { mn.x += dx26; mn.y += dy26; count++; }
      }
      console.log(`    ${gateNodeId}: shifted ${count} keystones by (${Math.round(dx26)},${Math.round(dy26)})`);
    }
  }

  // ─── 5k-27: Shift shield & book 160px up-right ───
  console.log("  5k-27: Shift shield & book 160px up-right");
  {
    const D27 = 160 / Math.SQRT2; // ~113.14px per axis
    const dx27 = +D27, dy27 = -D27; // up-right
    for (const gateNodeId of ["arc-warrior-mage", "arc-mage-archer"]) {
      const gate = nodeByNodeId(gateNodeId);
      if (!gate) continue;
      const members = getFigMembers5k(gate.id);
      let count = 0;
      for (const mid of members) {
        if (mid === gate.id) continue;
        const mn = nodeById(mid);
        if (mn) { mn.x += dx27; mn.y += dy27; count++; }
      }
      console.log(`    ${gateNodeId}: shifted ${count} keystones by (${Math.round(dx27)},${Math.round(dy27)})`);
    }
  }

  // ─── 5k-28: Position shield between nodes 71,84 + book 60px down ───
  console.log("  5k-28: Shield → midpoint(71,84), book → 60px down");
  {
    // Shield: move centroid to midpoint between warrior-inner-2 and mage-trunk-0
    const n71 = nodeByNodeId("warrior-inner-2");
    const n84 = nodeByNodeId("mage-trunk-0");
    const shieldGate = nodeByNodeId("arc-warrior-mage");
    if (n71 && n84 && shieldGate) {
      const midX = (n71.x + n84.x) / 2;
      const midY = (n71.y + n84.y) / 2;
      const members = getFigMembers5k(shieldGate.id);
      let sx = 0, sy = 0, cnt = 0;
      for (const mid of members) {
        if (mid === shieldGate.id) continue;
        const mn = nodeById(mid);
        if (mn) { sx += mn.x; sy += mn.y; cnt++; }
      }
      const dx28 = midX - sx / cnt;
      const dy28 = midY - sy / cnt;
      for (const mid of members) {
        if (mid === shieldGate.id) continue;
        const mn = nodeById(mid);
        if (mn) { mn.x += dx28; mn.y += dy28; }
      }
      console.log(`    shield: shifted ${cnt} ks by (${Math.round(dx28)},${Math.round(dy28)}) → centroid (${Math.round(midX)},${Math.round(midY)})`);
    }

    // Book: shift 60px down
    const bookGate = nodeByNodeId("arc-mage-archer");
    if (bookGate) {
      const members = getFigMembers5k(bookGate.id);
      let cnt = 0;
      for (const mid of members) {
        if (mid === bookGate.id) continue;
        const mn = nodeById(mid);
        if (mn) { mn.y += 60; cnt++; }
      }
      console.log(`    book: shifted ${cnt} ks by (0,+60)`);
    }
  }

  // ─── 5k-29: Move book centroid to midpoint(73,88) — between mage-inner-2 and archer-trunk-0 ───
  console.log("  5k-29: Move book → midpoint(mage-inner-2, archer-trunk-0)");
  {
    const nA = nodeByNodeId("mage-inner-2");
    const nB = nodeByNodeId("archer-trunk-0");
    const bookGate29 = nodeByNodeId("arc-mage-archer");
    if (nA && nB && bookGate29) {
      const midX = (nA.x + nB.x) / 2;
      const midY = (nA.y + nB.y) / 2;
      const members = getFigMembers5k(bookGate29.id);
      let sx = 0, sy = 0, cnt = 0;
      for (const mid of members) {
        if (mid === bookGate29.id) continue;
        const mn = nodeById(mid);
        if (mn) { sx += mn.x; sy += mn.y; cnt++; }
      }
      const dx29 = midX - sx / cnt;
      const dy29 = midY - sy / cnt;
      for (const mid of members) {
        if (mid === bookGate29.id) continue;
        const mn = nodeById(mid);
        if (mn) { mn.x += dx29; mn.y += dy29; }
      }
      console.log(`    book: shifted ${cnt} ks by (${Math.round(dx29)},${Math.round(dy29)}) → centroid (${Math.round(midX)},${Math.round(midY)})`);
    }
  }

  // ─── 5k-30: Delete book-ks7 (596) and book-ks6 (595) ───
  console.log("  5k-30: Delete book-ks7 and book-ks6");
  {
    for (const ksName of ["mage-archer-book-ks7", "mage-archer-book-ks6"]) {
      const ks = nodeByNodeId(ksName);
      if (!ks) { console.log(`    ${ksName}: not found`); continue; }
      const conns = [...ks.connections];
      if (conns.length === 2) {
        deleteNodeAndReconnect(ks.id, conns[0], conns[1]);
        removeFigureEdge(ks.id, conns[0]);
        removeFigureEdge(ks.id, conns[1]);
        addFigureEdge(conns[0], conns[1]);
      } else {
        // More than 2 connections — just delete, neighbors stay connected through other paths
        for (const c of conns) {
          removeEdge(ks.id, c);
          removeFigureEdge(ks.id, c);
        }
        deleteNode(ks.id);
      }
      const fmIdx = figMembership.findIndex(([nid]: [number, number]) => nid === ks.id);
      if (fmIdx >= 0) figMembership.splice(fmIdx, 1);
      console.log(`    deleted ${ksName} (${ks.id}), was connected to [${conns}]`);
    }
  }

  // ─── 5k-31: Add intermediate nodes on new edges book-ks3↔ks5 and book-ks0↔ks2 ───
  // (User: "добавь ноды на ребра 592↔595 и 593↔591" — these are ks3↔ks6 and ks4↔ks2,
  //  but ks6 was deleted, so we use ks3↔ks5 and ks0↔ks2 as the nearest structural addition)
  console.log("  5k-31: Add intermediate nodes on book edges ks3↔ks5 and ks0↔ks2");
  {
    const bookGate31 = nodeByNodeId("arc-mage-archer");
    if (bookGate31) {
      const figId31 = figMembership.find(([nid]: [number, number]) => nid === bookGate31.id)?.[1] ?? -1;
      const pairs: [string, string][] = [
        ["mage-archer-book-ks3", "mage-archer-book-ks5"],
        ["mage-archer-book-ks0", "mage-archer-book-ks2"],
      ];
      for (const [nameA, nameB] of pairs) {
        const nA = nodeByNodeId(nameA);
        const nB = nodeByNodeId(nameB);
        if (!nA || !nB) continue;
        const midNode = {
          id: nextId5k++,
          nodeId: `mage-archer-book-mid-${nameA.slice(-3)}-${nameB.slice(-3)}`,
          type: "keystone" as any,
          classAffinity: "mage",
          x: (nA.x + nB.x) / 2,
          y: (nA.y + nB.y) / 2,
          label: "",
          name: null,
          stat: null,
          value: 0,
          defId: null,
          mods: [],
          connections: [] as number[],
          connector: false,
        };
        nodes.push(midNode);
        addEdge(nA.id, midNode.id);
        addEdge(midNode.id, nB.id);
        addFigureEdge(nA.id, midNode.id);
        addFigureEdge(midNode.id, nB.id);
        figMembership.push([midNode.id, figId31]);
        console.log(`    added mid node ${midNode.id} at (${Math.round(midNode.x)},${Math.round(midNode.y)}) between ${nameA}↔${nameB}`);
      }
    }
  }

  // ─── 5k-32: Scale book figure by 1.25× ───
  console.log("  5k-32: Scale book 125%");
  {
    const bookGate32 = nodeByNodeId("arc-mage-archer");
    if (bookGate32) {
      scaleFigure5k(bookGate32.id, getFigMembers5k(bookGate32.id), 1.25);
      console.log("    scaled book by 1.25×");
    }
  }

  // ─── 5k-33: Delete s0fig-t2 for all classes (node 492 equiv) ───
  console.log("  5k-33: Delete s0fig-t2 (all classes)");
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const ks = nodeByNodeId(`${cls}-s0fig-t2`);
    if (!ks) { console.log(`    ${cls}: not found`); continue; }
    const conns = [...ks.connections];
    if (conns.length === 2) {
      deleteNodeAndReconnect(ks.id, conns[0], conns[1]);
      removeFigureEdge(ks.id, conns[0]);
      removeFigureEdge(ks.id, conns[1]);
      addFigureEdge(conns[0], conns[1]);
    } else {
      deleteNode(ks.id);
    }
    const fmIdx = figMembership.findIndex(([nid]: [number, number]) => nid === ks.id);
    if (fmIdx >= 0) figMembership.splice(fmIdx, 1);
    console.log(`    ${cls}: deleted s0fig-t2 (${ks.id}), reconnected [${conns}]`);
  }

  // ─── 5k-34: Move book 30% closer to gate node 423 ───
  console.log("  5k-34: Move book 30% closer to arc-mage-archer");
  {
    const gate34 = nodeByNodeId("arc-mage-archer");
    if (gate34) {
      const members = getFigMembers5k(gate34.id);
      let sx = 0, sy = 0, cnt = 0;
      for (const mid of members) {
        if (mid === gate34.id) continue;
        const mn = nodeById(mid);
        if (mn) { sx += mn.x; sy += mn.y; cnt++; }
      }
      const cx = sx / cnt, cy = sy / cnt;
      const dx34 = (gate34.x - cx) * 0.3;
      const dy34 = (gate34.y - cy) * 0.3;
      for (const mid of members) {
        if (mid === gate34.id) continue;
        const mn = nodeById(mid);
        if (mn) { mn.x += dx34; mn.y += dy34; }
      }
      console.log(`    shifted ${cnt} ks by (${Math.round(dx34)},${Math.round(dy34)})`);
    }
  }

  // ─── 5k-35: Connect gate 423 ↔ mid-ks3-ks5 (599) ───
  console.log("  5k-35: Connect arc-mage-archer ↔ book-mid-ks3-ks5");
  {
    const gate35 = nodeByNodeId("arc-mage-archer");
    const mid35 = nodeByNodeId("mage-archer-book-mid-ks3-ks5");
    if (gate35 && mid35) {
      addEdge(gate35.id, mid35.id);
      addFigureEdge(gate35.id, mid35.id);
      console.log(`    connected ${gate35.id}↔${mid35.id}`);
    }
  }

  // ─── 5k-36: Delete book-ks4 (589), add node between ks1↔ks0 (586↔585) ───
  console.log("  5k-36: Delete book-ks4, add node between ks1↔ks0");
  {
    const ks4 = nodeByNodeId("mage-archer-book-ks4");
    if (ks4) {
      const conns36 = [...ks4.connections];
      // Remove all edges from ks4
      for (const c of conns36) {
        removeEdge(ks4.id, c);
        removeFigureEdge(ks4.id, c);
      }
      deleteNode(ks4.id);
      const fmIdx = figMembership.findIndex(([nid]: [number, number]) => nid === ks4.id);
      if (fmIdx >= 0) figMembership.splice(fmIdx, 1);
      console.log(`    deleted ks4 (${ks4.id}), was connected to [${conns36}]`);
    }

    // Add intermediate node between ks1 and ks0
    const ks1 = nodeByNodeId("mage-archer-book-ks1");
    const ks0 = nodeByNodeId("mage-archer-book-ks0");
    const bookGate36 = nodeByNodeId("arc-mage-archer");
    if (ks1 && ks0 && bookGate36) {
      const figId36 = figMembership.find(([nid]: [number, number]) => nid === bookGate36.id)?.[1] ?? -1;
      const midNode36 = {
        id: nextId5k++,
        nodeId: "mage-archer-book-mid-ks1-ks0",
        type: "keystone" as any,
        classAffinity: "mage",
        x: (ks1.x + ks0.x) / 2,
        y: (ks1.y + ks0.y) / 2,
        label: "",
        name: null,
        stat: null,
        value: 0,
        defId: null,
        mods: [],
        connections: [] as number[],
        connector: false,
      };
      nodes.push(midNode36);
      // Split edge ks1↔ks0: remove old, add ks1↔mid↔ks0
      removeEdge(ks1.id, ks0.id);
      removeFigureEdge(ks1.id, ks0.id);
      addEdge(ks1.id, midNode36.id);
      addEdge(midNode36.id, ks0.id);
      addFigureEdge(ks1.id, midNode36.id);
      addFigureEdge(midNode36.id, ks0.id);
      figMembership.push([midNode36.id, figId36]);
      console.log(`    added mid node ${midNode36.id} at (${Math.round(midNode36.x)},${Math.round(midNode36.y)}) between ks1↔ks0`);
    }
  }

  // ─── 5k-37: Delete vweb-0-gate for all classes (slingshot start) ───
  console.log("  5k-37: Delete vweb-0-gate (all classes)");
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const gate37 = nodeByNodeId(`${cls}-fig-vweb-0-gate`);
    if (!gate37) { console.log(`    ${cls}: not found`); continue; }
    const conns37 = [...gate37.connections];
    if (conns37.length === 2) {
      deleteNodeAndReconnect(gate37.id, conns37[0], conns37[1]);
      removeFigureEdge(gate37.id, conns37[0]);
      removeFigureEdge(gate37.id, conns37[1]);
      addFigureEdge(conns37[0], conns37[1]);
    } else {
      deleteNode(gate37.id);
    }
    const fmIdx = figMembership.findIndex(([nid]: [number, number]) => nid === gate37.id);
    if (fmIdx >= 0) figMembership.splice(fmIdx, 1);
    console.log(`    ${cls}: deleted vweb-0-gate (${gate37.id}), reconnected [${conns37}]`);
  }

  // ─── 5k-38: Move mage-iweb-0 away from mage-web4e-n2, match samurai dist ───
  console.log("  5k-38: Move mage-iweb-0 away from web4e-n2 to match samurai spacing");
  {
    const sIweb = nodeByNodeId("samurai-iweb-0");
    const sW4n2 = nodeByNodeId("samurai-web4e-n2");
    const mIweb = nodeByNodeId("mage-iweb-0");
    const mW4n2 = nodeByNodeId("mage-web4e-n2");
    if (sIweb && sW4n2 && mIweb && mW4n2) {
      const targetDist = Math.sqrt((sIweb.x - sW4n2.x) ** 2 + (sIweb.y - sW4n2.y) ** 2);
      const dx = mIweb.x - mW4n2.x;
      const dy = mIweb.y - mW4n2.y;
      const curDist = Math.sqrt(dx * dx + dy * dy);
      if (curDist > 0) {
        const scale = targetDist / curDist;
        const newX = mW4n2.x + dx * scale;
        const newY = mW4n2.y + dy * scale;
        console.log(`    target dist=${targetDist.toFixed(1)}, cur=${curDist.toFixed(1)}, shift (${Math.round(newX - mIweb.x)},${Math.round(newY - mIweb.y)})`);
        mIweb.x = newX;
        mIweb.y = newY;
      }
    }
  }

  // ─── 5k-39: Move mid-ks3-ks5 to old book-ks4 position (restore bend) ───
  // Old ks4 was at shape position [3.5, 0] — 0.5 units forward of midpoint(ks3,ks5).
  // Compute the offset from midpoint(ks3,ks5) toward the gate direction and apply.
  console.log("  5k-39: Restore book bend — move mid-ks3-ks5 to old ks4 position");
  {
    const ks3_39 = nodeByNodeId("mage-archer-book-ks3");
    const ks5_39 = nodeByNodeId("mage-archer-book-ks5");
    const mid39 = nodeByNodeId("mage-archer-book-mid-ks3-ks5");
    const gate39 = nodeByNodeId("arc-mage-archer");
    if (ks3_39 && ks5_39 && mid39 && gate39) {
      // Midpoint of ks3 and ks5
      const mx = (ks3_39.x + ks5_39.x) / 2;
      const my = (ks3_39.y + ks5_39.y) / 2;
      // Direction from midpoint toward gate (= "forward" in original shape)
      const dx = gate39.x - mx;
      const dy = gate39.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // In original shape, ks4 was 0.5 units forward from midpoint.
      // ks3↔ks5 lateral distance was 3.0 units. After scaling by S23=25 and 1.25×,
      // 0.5 unit ≈ 0.5 * 25 * 1.25 = 15.6px in the forward direction.
      // But let's use the actual ks3↔ks5 distance to compute proportionally:
      // ks3↔ks5 lateral = 3.0 units, ks4 forward offset = 0.5 units = 1/6 of lateral dist
      const latDx = ks5_39.x - ks3_39.x;
      const latDy = ks5_39.y - ks3_39.y;
      const latDist = Math.sqrt(latDx * latDx + latDy * latDy);
      const fwdOffset = latDist / 6; // 0.5/3.0 ratio
      if (dist > 0) {
        const oldX = mid39.x;
        const oldY = mid39.y;
        mid39.x = mx + (dx / dist) * fwdOffset;
        mid39.y = my + (dy / dist) * fwdOffset;
        console.log(`    moved mid-ks3-ks5 from (${Math.round(oldX)},${Math.round(oldY)}) to (${Math.round(mid39.x)},${Math.round(mid39.y)}), fwdOffset=${fwdOffset.toFixed(1)}px`);
      }
    }
  }

  // ─── 5k-40: Shift inner-2 down-right (+20,+20) for all classes ───
  console.log("  5k-40: Shift inner-2 (+20,+20) for all classes");
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const n = nodeByNodeId(`${cls}-inner-2`);
    if (!n) continue;
    n.x += 20;
    n.y += 20;
    console.log(`    ${cls}: inner-2 → (${Math.round(n.x)},${Math.round(n.y)})`);
  }

  // ─── 5k-41: Scale web4eR triangle 1.2× from trunk-3 pivot (all classes) ───
  // Increases both internal distances AND trunk-3↔n1 distance by 20%
  console.log("  5k-41: Scale web4eR 1.2× from trunk-3 (all classes)");
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const trunk3 = nodeByNodeId(`${cls}-trunk-3`);
    const rn1 = nodeByNodeId(`${cls}-web4eR-n1`);
    const rn2 = nodeByNodeId(`${cls}-web4eR-n2`);
    const rn3 = nodeByNodeId(`${cls}-web4eR-n3`);
    const rn4 = nodeByNodeId(`${cls}-web4eR-n4`);
    if (!trunk3 || !rn1) continue;
    const triNodes = [rn1, rn2, rn3, rn4].filter(Boolean) as typeof rn1[];
    for (const n of triNodes) {
      const dx = n.x - trunk3.x;
      const dy = n.y - trunk3.y;
      n.x = trunk3.x + dx * 1.2;
      n.y = trunk3.y + dy * 1.2;
    }
    console.log(`    ${cls}: scaled ${triNodes.length} web4eR nodes 1.2× from trunk-3`);
  }

  // ─── 5k-42: Rotate tendril-s1-d1 figure -20° (CCW) around gate (samurai) ───
  console.log("  5k-42: Rotate tendril-s1-d1 -20° around gate (samurai)");
  {
    const gate42 = nodeByNodeId("samurai-fig-tendril-s1-d1-gate");
    if (gate42) {
      const prefix42 = "samurai-fig-tendril-s1-d1-";
      const members42 = nodes.filter(n => n.nodeId.startsWith(prefix42)).map(n => n.id);
      rotateFigure5k(gate42.id, members42, -20);
      console.log(`    Rotated ${members42.length} nodes -20° around gate (${gate42.id})`);
    }
  }

  // ─── 5k-43: Scale bfig-1 figure 1.5× from gate (samurai) ───
  console.log("  5k-43: Scale bfig-1 1.5× from gate (samurai)");
  {
    const gate43 = nodeByNodeId("samurai-fig-bfig-1-gate");
    if (gate43) {
      const prefix43 = "samurai-fig-bfig-1-";
      const members43 = nodes.filter(n => n.nodeId.startsWith(prefix43)).map(n => n.id);
      scaleFigure5k(gate43.id, members43, 1.5);
      console.log(`    Scaled ${members43.length} nodes 1.5× from gate (${gate43.id})`);
    }
  }

  // ─── 5k-44: Delete warrior-fig-tendril-m2R-d1-ks5 (node 231), reconnect ks6→ks3 ───
  console.log("  5k-44: Delete warrior-tendril-m2R-ks5, reconnect ks6→ks3");
  {
    const ks5_44 = nodeByNodeId("warrior-fig-tendril-m2R-d1-ks5");
    const ks6_44 = nodeByNodeId("warrior-fig-tendril-m2R-d1-ks6");
    const ks3_44 = nodeByNodeId("warrior-fig-tendril-m2R-d1-ks3");
    if (ks5_44 && ks6_44 && ks3_44) {
      deleteNode(ks5_44.id);
      addEdge(ks6_44.id, ks3_44.id);
      addFigureEdge(ks6_44.id, ks3_44.id);
      console.log(`    Deleted ks5 (${ks5_44.id}), reconnected ks6 (${ks6_44.id})↔ks3 (${ks3_44.id})`);
    }
  }

  // ─── 5k-45: Rotate mage-fig-tendril-m1R-d1 110° CW around gate (274) ───
  console.log("  5k-45: Rotate mage-tendril-m1R-d1 +110° around gate");
  {
    const gate45 = nodeByNodeId("mage-fig-tendril-m1R-d1-gate");
    if (gate45) {
      const prefix45 = "mage-fig-tendril-m1R-d1-";
      const members45 = nodes.filter(n => n.nodeId.startsWith(prefix45)).map(n => n.id);
      rotateFigure5k(gate45.id, members45, 110);
      console.log(`    Rotated ${members45.length} nodes +110° around gate (${gate45.id})`);
    }
  }

  // ─── 5k-46: Connect archer-tendril-m0L-d1-s0 (309) to gate (310) instead of ks4 (314) ───
  console.log("  5k-46: Reconnect archer-m0L-s0 → gate instead of ks4");
  {
    const s0_46 = nodeByNodeId("archer-tendril-m0L-d1-s0");
    const gate46 = nodeByNodeId("archer-fig-tendril-m0L-d1-gate");
    const ks4_46 = nodeByNodeId("archer-fig-tendril-m0L-d1-ks4");
    if (s0_46 && gate46 && ks4_46) {
      removeEdge(s0_46.id, ks4_46.id);
      addEdge(s0_46.id, gate46.id);
      console.log(`    Removed ${s0_46.id}↔${ks4_46.id}, added ${s0_46.id}↔${gate46.id}`);
    }
  }

  // ─── 5k-47: Connect mage-tendril-m2L-s0 (283) to ks1 (285) instead of ks5 (289) + move 10px away ───
  console.log("  5k-47: Reconnect mage-m2L-s0 → ks1 instead of ks5 + shift 10px");
  {
    const s0_47 = nodeByNodeId("mage-tendril-m2L-d1-s0");
    const ks1_47 = nodeByNodeId("mage-fig-tendril-m2L-d1-ks1");
    const ks5_47 = nodeByNodeId("mage-fig-tendril-m2L-d1-ks5");
    if (s0_47 && ks1_47 && ks5_47) {
      removeEdge(s0_47.id, ks5_47.id);
      addEdge(s0_47.id, ks1_47.id);
      // Move s0 10px away from ks1 along ks1→s0 direction
      const dx47 = s0_47.x - ks1_47.x;
      const dy47 = s0_47.y - ks1_47.y;
      const dist47 = Math.sqrt(dx47 * dx47 + dy47 * dy47);
      if (dist47 > 0) {
        s0_47.x += (dx47 / dist47) * 10;
        s0_47.y += (dy47 / dist47) * 10;
      }
      console.log(`    Reconnected ${s0_47.id}↔${ks1_47.id}, moved s0 10px away to (${Math.round(s0_47.x)},${Math.round(s0_47.y)})`);
    }
  }

  // ─── 5k-48: Delete archer-fig-tendril-m0R-d1-ks7 (leaf node 326) ───
  console.log("  5k-48: Delete archer-tendril-m0R-ks7 (leaf)");
  {
    const ks7_48 = nodeByNodeId("archer-fig-tendril-m0R-d1-ks7");
    if (ks7_48) {
      deleteNode(ks7_48.id);
      console.log(`    Deleted ks7 (${ks7_48.id})`);
    }
  }

  // ─── 5k-49: Scale samurai-fig-tendril-m1R-d1 figure 1.25× from gate (142) ───
  console.log("  5k-49: Scale samurai-tendril-m1R-d1 1.25× from gate");
  {
    const gate49 = nodeByNodeId("samurai-fig-tendril-m1R-d1-gate");
    if (gate49) {
      const prefix49 = "samurai-fig-tendril-m1R-d1-";
      const members49 = nodes.filter(n => n.nodeId.startsWith(prefix49)).map(n => n.id);
      scaleFigure5k(gate49.id, members49, 1.25);
      console.log(`    Scaled ${members49.length} nodes 1.25× from gate (${gate49.id})`);
    }
  }

  // ─── 5k-50: Rotate archer-fig-tendril-m1R-d1 180° around node 336 (gate) ───
  console.log("  5k-50: Rotate archer-tendril-m1R-d1 180° around gate (336)");
  {
    const gate50 = nodeByNodeId("archer-fig-tendril-m1R-d1-gate");
    if (gate50) {
      const prefix50 = "archer-fig-tendril-m1R-d1-";
      const members50 = nodes.filter(n => n.nodeId.startsWith(prefix50)).map(n => n.id);
      rotateFigure5k(gate50.id, members50, 180);
      console.log(`    Rotated ${members50.length} nodes 180° around gate (${gate50.id})`);
    }
  }

  // ─── 5k-51: Move mage-fig-tendril-m1R-d1 figure down 10px + rebind 272→274 ───
  console.log("  5k-51: Move mage-tendril-m1R-d1 down 10px + rebind 272→274");
  {
    const prefix51 = "mage-fig-tendril-m1R-d1-";
    const figNodes51 = nodes.filter(n => n.nodeId.startsWith(prefix51));
    for (const n of figNodes51) {
      n.y += 10;
    }
    console.log(`    Moved ${figNodes51.length} nodes down 10px`);

    // Rebind 272 (mage-tendril-m1R-d1-s0) to 274 (ks0) instead of 273 (gate)
    const s0_51 = nodeByNodeId("mage-tendril-m1R-d1-s0");
    const gate51 = nodeByNodeId("mage-fig-tendril-m1R-d1-gate");
    const ks0_51 = nodeByNodeId("mage-fig-tendril-m1R-d1-ks0");
    if (s0_51 && gate51 && ks0_51) {
      removeEdge(s0_51.id, gate51.id);
      addEdge(s0_51.id, ks0_51.id);
      console.log(`    Rebound s0 (${s0_51.id}) from gate (${gate51.id}) to ks0 (${ks0_51.id})`);
    }
  }

  // ─── 5k-52: Replace m0Rfig with arrow shape (all classes) ───
  console.log("  5k-52: Replace m0Rfig with arrow shape (all classes)");
  {
    // Arrow positions in (forward, lateral) coordinates, scale S=14
    const S52 = 14;
    const arrowPos: [number, number][] = [
      [1.0, 0],      // 0: shaft back (s-a, gate connection)
      [2.0, 0],      // 1: shaft (s-b)
      [3.0, 0],      // 2: shaft front (s-c)
      [4.0, 0],      // 3: junction (s-d)
      [5.5, 0],      // 4: tip (s-e)
      [4.5, 1.3],    // 5: upper barb (NEW)
      [4.5, -1.3],   // 6: lower barb (NEW)
    ];
    const ksNames = ["s-a", "s-b", "s-c", "s-d", "s-e"];

    for (const cls of ["samurai", "warrior", "mage", "archer"]) {
      const gate52 = nodeByNodeId(`${cls}-fig-m0Rfig-gate`);
      const sa52 = nodeByNodeId(`${cls}-fig-m0Rfig-s-a`);
      if (!gate52 || !sa52) continue;

      // Compute forward/lateral unit vectors from gate→s-a
      const dx52 = sa52.x - gate52.x;
      const dy52 = sa52.y - gate52.y;
      const dist52 = Math.sqrt(dx52 * dx52 + dy52 * dy52);
      if (dist52 === 0) continue;
      const fwd_x = dx52 / dist52;
      const fwd_y = dy52 / dist52;
      const lat_x = -fwd_y; // 90° CCW
      const lat_y = fwd_x;

      // Reposition existing 5 keystones (s-a through s-e) to arrow positions 0-4
      for (let i = 0; i < 5; i++) {
        const n = nodeByNodeId(`${cls}-fig-m0Rfig-${ksNames[i]}`);
        if (!n) continue;
        const [f, l] = arrowPos[i];
        n.x = gate52.x + fwd_x * f * S52 + lat_x * l * S52;
        n.y = gate52.y + fwd_y * f * S52 + lat_y * l * S52;
      }

      // Get s-d (junction) for connecting barbs
      const sd52 = nodeByNodeId(`${cls}-fig-m0Rfig-s-d`);
      if (!sd52) continue;

      // Get figId from existing membership
      const fmEntry = figMembership.find(([nid]: [number, number]) => nid === gate52.id);
      const figId52 = fmEntry ? fmEntry[1] : -1;

      // Create upper barb node
      const [f5, l5] = arrowPos[5];
      const upperBarb = {
        id: nextId5k++,
        nodeId: `${cls}-fig-m0Rfig-s-f`,
        type: "keystone" as any,
        classAffinity: cls,
        x: gate52.x + fwd_x * f5 * S52 + lat_x * l5 * S52,
        y: gate52.y + fwd_y * f5 * S52 + lat_y * l5 * S52,
        label: "",
        name: null,
        stat: null,
        value: 0,
        defId: null,
        mods: [],
        connections: [] as number[],
        connector: false,
      };
      nodes.push(upperBarb);
      addEdge(sd52.id, upperBarb.id);
      addFigureEdge(sd52.id, upperBarb.id);
      if (figId52 >= 0) figMembership.push([upperBarb.id, figId52]);

      // Create lower barb node
      const [f6, l6] = arrowPos[6];
      const lowerBarb = {
        id: nextId5k++,
        nodeId: `${cls}-fig-m0Rfig-s-g`,
        type: "keystone" as any,
        classAffinity: cls,
        x: gate52.x + fwd_x * f6 * S52 + lat_x * l6 * S52,
        y: gate52.y + fwd_y * f6 * S52 + lat_y * l6 * S52,
        label: "",
        name: null,
        stat: null,
        value: 0,
        defId: null,
        mods: [],
        connections: [] as number[],
        connector: false,
      };
      nodes.push(lowerBarb);
      addEdge(sd52.id, lowerBarb.id);
      addFigureEdge(sd52.id, lowerBarb.id);
      if (figId52 >= 0) figMembership.push([lowerBarb.id, figId52]);

      console.log(`    ${cls}: repositioned 5 nodes + added barbs (${upperBarb.id},${lowerBarb.id}) at junction ${sd52.id}`);
    }
  }

  // ─── 5k-53: Simplify arrow to 3 shaft + 2 arrowhead (all classes) ───
  // Delete s-d(junction), s-e(tip), s-c becomes junction → s-f(barb1), s-g(barb2)
  // Result: gate → s-a → s-b → s-c → [s-f, s-g] with s-f↔s-g
  console.log("  5k-53: Simplify arrow to 3+2 nodes (all classes)");
  {
    for (const cls of ["samurai", "warrior", "mage", "archer"]) {
      const gate53 = nodeByNodeId(`${cls}-fig-m0Rfig-gate`);
      const sa = nodeByNodeId(`${cls}-fig-m0Rfig-s-a`);
      const sc = nodeByNodeId(`${cls}-fig-m0Rfig-s-c`);
      const sd = nodeByNodeId(`${cls}-fig-m0Rfig-s-d`);
      const se = nodeByNodeId(`${cls}-fig-m0Rfig-s-e`);
      const sf = nodeByNodeId(`${cls}-fig-m0Rfig-s-f`);
      const sg = nodeByNodeId(`${cls}-fig-m0Rfig-s-g`);
      if (!gate53 || !sa || !sc || !sd || !se || !sf || !sg) continue;

      // Delete s-d (junction) and s-e (tip) — deleteNode removes all their edges
      deleteNode(sd.id);
      deleteNode(se.id);
      console.log(`    ${cls}: deleted s-d (${sd.id}) and s-e (${se.id})`);

      // Compute forward/lateral from gate→s-a
      const dx53 = sa.x - gate53.x;
      const dy53 = sa.y - gate53.y;
      const dist53 = Math.sqrt(dx53 * dx53 + dy53 * dy53);
      if (dist53 === 0) continue;
      const fwd_x = dx53 / dist53;
      const fwd_y = dy53 / dist53;
      const lat_x = -fwd_y;
      const lat_y = fwd_x;

      // Reposition s-f and s-g as arrowhead barbs from s-c (tip)
      // Barbs go backward and spread laterally — V-shape arrowhead
      const S53 = 14;
      sf.x = sc.x - fwd_x * 1.0 * S53 + lat_x * 1.3 * S53;
      sf.y = sc.y - fwd_y * 1.0 * S53 + lat_y * 1.3 * S53;
      sg.x = sc.x - fwd_x * 1.0 * S53 - lat_x * 1.3 * S53;
      sg.y = sc.y - fwd_y * 1.0 * S53 - lat_y * 1.3 * S53;

      // Connect s-c → s-f, s-c → s-g (V-shape, no s-f↔s-g to avoid crossing shaft)
      addEdge(sc.id, sf.id);
      addEdge(sc.id, sg.id);
      addFigureEdge(sc.id, sf.id);
      addFigureEdge(sc.id, sg.id);

      console.log(`    ${cls}: s-c (${sc.id}) → s-f (${sf.id}) at (${Math.round(sf.x)},${Math.round(sf.y)}), s-g (${sg.id}) at (${Math.round(sg.x)},${Math.round(sg.y)})`);
    }
  }

  // ─── 5k-54: Reposition arrow nodes along s0→branch-1 line (all classes) ───
  // gate=20%, s-a=40%, s-b=60%, s-c=80% of distance(s0, branch-1)
  // barbs (s-f, s-g) on perpendicular through s-b
  console.log("  5k-54: Reposition arrow on s0→branch-1 line (all classes)");
  {
    for (const cls of ["samurai", "warrior", "mage", "archer"]) {
      const s0 = nodeByNodeId(`${cls}-tendril-m0R-d1-s0`);
      const br1 = nodeByNodeId(`${cls}-branch-1`);
      const gate54 = nodeByNodeId(`${cls}-fig-m0Rfig-gate`);
      const sa54 = nodeByNodeId(`${cls}-fig-m0Rfig-s-a`);
      const sb54 = nodeByNodeId(`${cls}-fig-m0Rfig-s-b`);
      const sc54 = nodeByNodeId(`${cls}-fig-m0Rfig-s-c`);
      const sf54 = nodeByNodeId(`${cls}-fig-m0Rfig-s-f`);
      const sg54 = nodeByNodeId(`${cls}-fig-m0Rfig-s-g`);
      if (!s0 || !br1 || !gate54 || !sa54 || !sb54 || !sc54 || !sf54 || !sg54) continue;

      const dx = br1.x - s0.x;
      const dy = br1.y - s0.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) continue;

      // Unit vectors along and perpendicular to line
      const ux = dx / dist;
      const uy = dy / dist;
      const px = -uy;  // perpendicular
      const py = ux;

      // Place nodes at percentages along line
      gate54.x = s0.x + dx * 0.20;
      gate54.y = s0.y + dy * 0.20;
      sa54.x = s0.x + dx * 0.40;
      sa54.y = s0.y + dy * 0.40;
      sb54.x = s0.x + dx * 0.60;
      sb54.y = s0.y + dy * 0.60;
      sc54.x = s0.x + dx * 0.80;
      sc54.y = s0.y + dy * 0.80;

      // Barbs on perpendicular through s-b, spread 25px each side
      const barbSpread = 25;
      sf54.x = sb54.x + px * barbSpread;
      sf54.y = sb54.y + py * barbSpread;
      sg54.x = sb54.x - px * barbSpread;
      sg54.y = sb54.y - py * barbSpread;

      console.log(`    ${cls}: gate(${Math.round(gate54.x)},${Math.round(gate54.y)}) sa(${Math.round(sa54.x)},${Math.round(sa54.y)}) sb(${Math.round(sb54.x)},${Math.round(sb54.y)}) sc(${Math.round(sc54.x)},${Math.round(sc54.y)}) sf(${Math.round(sf54.x)},${Math.round(sf54.y)}) sg(${Math.round(sg54.x)},${Math.round(sg54.y)})`);
    }
  }

  // ─── 5k-55: Promote figure nodes to "notable" (+1 per 3 nodes in figure) ───
  // For each figure: floor(memberCount / 3) keystones → notable (strong tier)
  // Pick keystones farthest from gate (tips of figure = visually prominent)
  console.log("  5k-55: Promote figure nodes — +1 notable per 3 members");
  {
    // Group figMembership by figureId
    const figGroups = new Map<number, number[]>();
    for (const [nid, fid] of figMembership) {
      if (!figGroups.has(fid)) figGroups.set(fid, []);
      figGroups.get(fid)!.push(nid);
    }

    let totalPromoted = 0;
    for (const [fid, memberIds] of figGroups) {
      const nPromote = Math.floor(memberIds.length / 3);
      if (nPromote <= 0) continue;

      // Find the gate (figureEntry type)
      const gate55 = memberIds.map(id => nodeById(id)).find(n => n && n.type === "figureEntry");
      if (!gate55) continue;

      // Collect keystones only (exclude gate)
      const keystones = memberIds
        .map(id => nodeById(id))
        .filter((n): n is NonNullable<typeof n> => !!n && n.type === "keystone");
      if (keystones.length === 0) continue;

      // Sort by distance from gate descending (farthest first = tips)
      keystones.sort((a, b) => {
        const da = (a.x - gate55.x) ** 2 + (a.y - gate55.y) ** 2;
        const db = (b.x - gate55.x) ** 2 + (b.y - gate55.y) ** 2;
        return db - da;
      });

      // Promote farthest keystones
      const toPromote = keystones.slice(0, nPromote);
      for (const n of toPromote) {
        n.type = "notable";
        totalPromoted++;
      }
    }
    console.log(`    Promoted ${totalPromoted} keystones → notable across all figures`);
  }

  // ─── 5k-56: Align iweb-0 and fig-vweb-0-handle vertically (all classes) ───
  // Move both to average X — minimizes displacement, avoids crossings
  console.log("  5k-56: Align iweb-0 ↔ vweb-0-handle vertically (all classes)");
  for (const cls of ["samurai", "warrior", "mage", "archer"]) {
    const iweb = nodeByNodeId(`${cls}-iweb-0`);
    const handle = nodeByNodeId(`${cls}-fig-vweb-0-handle`);
    if (!iweb || !handle) { console.log(`    ${cls}: SKIP — node not found`); continue; }

    const avgX = (iweb.x + handle.x) / 2;
    const dxIweb = avgX - iweb.x;
    const dxHandle = avgX - handle.x;
    if (Math.abs(dxIweb) < 0.1 && Math.abs(dxHandle) < 0.1) { console.log(`    ${cls}: already aligned`); continue; }

    // Move iweb-0
    iweb.x = avgX;

    // Move handle's figure
    const members56 = getFigMembers5k(handle.id);
    for (const mid of members56) {
      const mn = nodeById(mid);
      if (mn) mn.x += dxHandle;
    }
    if (!members56.includes(handle.id)) handle.x += dxHandle;

    console.log(`    ${cls}: avgX=${Math.round(avgX)}, iweb dx=${Math.round(dxIweb)}, fig dx=${Math.round(dxHandle)} (${members56.length} nodes)`);
  }

  // ─── 5k-57: Change node types (all classes) ───
  console.log("  5k-57: Change node types — web/trunk/branch nodes (all classes)");
  {
    // Nodes to → keystone (medium tier)
    const toKeystone = [
      "web4eR-n1", "web4eR-n2", "web4eR-n3",
      "web4e-n1", "web4e-n2", "web4e-n3", "web4e-n4",
      "trunk-2", "branch-3", "trunk-4", "branch-1",
      "tendril-m1-d2-s1", "tendril-m0-d2-s1", "tendril-m2-d2-s1", "trunk-0",
    ];
    // Nodes to → notable (strong tier)
    const toNotable = [
      "web4eR-n4", "web4e-center",
      "fig-vweb-0-tip-l", "fig-vweb-0-tip-r",
    ];

    let changed = 0;
    for (const cls of ["samurai", "warrior", "mage", "archer"]) {
      for (const suffix of toKeystone) {
        const n = nodeByNodeId(`${cls}-${suffix}`);
        if (n && n.type !== "keystone") {
          n.type = "keystone";
          changed++;
        }
      }
      for (const suffix of toNotable) {
        const n = nodeByNodeId(`${cls}-${suffix}`);
        if (n && n.type !== "notable") {
          n.type = "notable";
          changed++;
        }
      }
    }
    console.log(`    Changed ${changed} node types across all classes`);
  }

  // ─── 5k-58: Separate iweb-0 from vweb-0-handle vertically (warrior, mage, archer) ───
  // Samurai pattern: handle is 50px outward from iweb in Y. Replicate for other classes.
  console.log("  5k-58: Separate iweb-0 ↔ handle by 50px Y (warrior/mage/archer)");
  {
    const CY = 800;
    for (const cls of ["warrior", "mage", "archer"]) {
      const iweb = nodeByNodeId(`${cls}-iweb-0`);
      const handle = nodeByNodeId(`${cls}-fig-vweb-0-handle`);
      if (!iweb || !handle) continue;

      // Direction: if iweb is above center → handle goes further up (-Y)
      //            if iweb is below center → handle goes further down (+Y)
      const sign = iweb.y < CY ? -1 : +1;
      const targetHandleY = iweb.y + sign * 50;
      const deltaY = targetHandleY - handle.y;
      if (Math.abs(deltaY) < 1) { console.log(`    ${cls}: already separated`); continue; }

      // Shift entire handle figure
      const members58 = getFigMembers5k(handle.id);
      for (const mid of members58) {
        const mn = nodeById(mid);
        if (mn) mn.y += deltaY;
      }
      if (!members58.includes(handle.id)) handle.y += deltaY;

      console.log(`    ${cls}: handle figure shifted dy=${Math.round(deltaY)} (${members58.length} nodes)`);
    }
  }

  // ─── 5k-59: Move mage-inner-2 up-left to avoid overlap with web4eR-n3 ───
  console.log("  5k-59: Move mage-inner-2 up-left (-15, -15)");
  {
    const inner2 = nodeByNodeId("mage-inner-2");
    if (inner2) {
      inner2.x -= 15;
      inner2.y -= 15;
      console.log(`    mage-inner-2 → (${Math.round(inner2.x)}, ${Math.round(inner2.y)})`);
    }
  }

  // ─── 5k-60: Equalize inner-2 distance from start (all classes match samurai) ───
  console.log("  5k-60: Equalize inner-2 distance from start (target = samurai)");
  {
    const samI2 = nodeByNodeId("samurai-inner-2");
    const samSt = nodeByNodeId("samurai-start");
    if (samI2 && samSt) {
      const targetDist = Math.sqrt((samI2.x - samSt.x) ** 2 + (samI2.y - samSt.y) ** 2);
      console.log(`    target dist = ${targetDist.toFixed(1)}`);
      for (const cls of ["warrior", "mage", "archer"]) {
        const i2 = nodeByNodeId(`${cls}-inner-2`);
        const st = nodeByNodeId(`${cls}-start`);
        if (!i2 || !st) continue;
        const dx = i2.x - st.x, dy = i2.y - st.y;
        const curDist = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(curDist - targetDist) < 1) { console.log(`    ${cls}: already OK`); continue; }
        const scale = targetDist / curDist;
        const oldX = i2.x, oldY = i2.y;
        i2.x = st.x + dx * scale;
        i2.y = st.y + dy * scale;
        console.log(`    ${cls}: (${Math.round(oldX)},${Math.round(oldY)}) → (${Math.round(i2.x)},${Math.round(i2.y)}), dist ${curDist.toFixed(1)} → ${targetDist.toFixed(1)}`);
      }
    }
  }

  // ─── 5k-61: Place mage-iweb-0 on line(trunk-3, web4e-n1) + 10px right ───
  console.log("  5k-61: Place mage-iweb-0 on line(86,435) + 10px right");
  {
    const iweb = nodeByNodeId("mage-iweb-0");
    const p1 = nodeByNodeId("mage-trunk-3");     // 86
    const p2 = nodeByNodeId("mage-web4e-n1");    // 435
    if (iweb && p1 && p2) {
      // Line direction from p1 to p2
      const lx = p2.x - p1.x, ly = p2.y - p1.y;
      // Project iweb onto line: new X = current + 30
      const newX = iweb.x + 30;
      const t = (newX - p1.x) / lx;
      const newY = p1.y + t * ly;
      console.log(`    (${Math.round(iweb.x)},${Math.round(iweb.y)}) → (${Math.round(newX)},${Math.round(newY)})`);
      iweb.x = newX;
      iweb.y = newY;
    }
  }

  // ─── 5k-62: Re-align mage vweb-0-handle X to mage-iweb-0 after 5k-61 shift ───
  console.log("  5k-62: Re-align mage handle to iweb-0 X");
  {
    const iweb62 = nodeByNodeId("mage-iweb-0");
    const handle62 = nodeByNodeId("mage-fig-vweb-0-handle");
    if (iweb62 && handle62) {
      const dx = iweb62.x - handle62.x;
      const members62 = getFigMembers5k(handle62.id);
      for (const mid of members62) {
        const mn = nodeById(mid);
        if (mn) mn.x += dx;
      }
      if (!members62.includes(handle62.id)) handle62.x += dx;
      console.log(`    shifted ${members62.length} nodes dx=${Math.round(dx)}`);
    }
  }

  // ─── 5k-63: Swap node importance in figures (all classes) + inter-class + 423→keystone ───
  console.log("  5k-63: Swap node importance in figures");
  {
    // Per-class figure swaps: [figureSuffix, ksSuffix1, ksSuffix2]
    const classSwaps: [string, string][] = [
      ["fig-tendril-m1L-d1-ks2", "fig-tendril-m1L-d1-ks9"],
      ["fig-tendril-m1L-d1-ks4", "fig-tendril-m1L-d1-ks8"],
      ["fig-tendril-m1R-d1-ks2", "fig-tendril-m1R-d1-ks8"],
      ["fig-tendril-m2R-d1-ks3", "fig-tendril-m2R-d1-ks6"],
      ["fig-tendril-m2R-d1-ks5", "fig-tendril-m2R-d1-ks2"],
      ["fig-tendril-m0L-d1-ks4", "fig-tendril-m0L-d1-ks6"],
      ["fig-tendril-m0L-d1-ks1", "fig-tendril-m0L-d1-ks3"],
      ["s0fig-p3", "s0fig-t0"],
      ["fig-m0Rfig-s-c", "fig-m0Rfig-s-g"],
      ["fig-b1fig-ks-c", "fig-b1fig-ks-a"],
    ];

    let swapped = 0;
    for (const [s1, s2] of classSwaps) {
      for (const cls of ["samurai", "warrior", "mage", "archer"]) {
        const a = nodeByNodeId(`${cls}-${s1}`);
        const b = nodeByNodeId(`${cls}-${s2}`);
        if (a && b && a.type !== b.type) {
          const tmp = a.type;
          a.type = b.type;
          b.type = tmp;
          swapped++;
        }
      }
    }

    // Inter-class figure swaps (unique, no class variants)
    const interSwaps: [string, string][] = [
      ["mage-archer-book-mid-ks0-ks2", "mage-archer-book-ks0"],
      ["archer-samurai-bow-ks4", "archer-samurai-bow-ks0"],
      ["samurai-warrior-shuriken-ks5", "samurai-warrior-shuriken-ks0"],
      ["warrior-mage-shield-ks1", "warrior-mage-shield-ks3"],
      ["warrior-mage-shield-ks2", "warrior-mage-shield-ks4"],
    ];
    for (const [s1, s2] of interSwaps) {
      const a = nodeByNodeId(s1);
      const b = nodeByNodeId(s2);
      if (a && b && a.type !== b.type) {
        const tmp = a.type;
        a.type = b.type;
        b.type = tmp;
        swapped++;
      }
    }

    // 423 (samurai-iweb-0) → keystone (medium)
    const n423 = nodeByNodeId("samurai-iweb-0");
    if (n423) n423.type = "keystone";

    console.log(`    Swapped ${swapped} pairs, 423 → keystone`);
  }

  // ─── 5k-64: Connect book-mid-ks3-ks5 ↔ book-ks0 ───
  console.log("  5k-64: Connect 584 ↔ 571 (book-mid-ks3-ks5 ↔ book-ks0)");
  {
    const a64 = nodeByNodeId("mage-archer-book-mid-ks3-ks5");
    const b64 = nodeByNodeId("mage-archer-book-ks0");
    if (a64 && b64) {
      addEdge(a64.id, b64.id);
      addFigureEdge(a64.id, b64.id);
      console.log(`    Added edge ${a64.id}↔${b64.id}`);
    }
  }

  // ─── 5k-65: Scale samurai-tendril-m1R-d1 1.2× from gate ───
  console.log("  5k-65: Scale samurai-tendril-m1R-d1 1.2× from gate (142)");
  {
    const gate65 = nodeByNodeId("samurai-fig-tendril-m1R-d1-gate");
    if (gate65) {
      const members65 = getFigMembers5k(gate65.id);
      scaleFigure5k(gate65.id, members65, 1.2);
      console.log(`    Scaled ${members65.length} nodes 1.2× from gate (${gate65.id})`);
    }
  }

  // ─── 5k-66: Increase edge 95↔379 by 30% (move bfig-1 figure outward) ───
  console.log("  5k-66: Increase edge 95↔379 by 30%");
  {
    const n95 = nodeByNodeId("samurai-branch-3");
    const gate66 = nodeByNodeId("samurai-fig-bfig-1-gate");
    if (n95 && gate66) {
      const dx = gate66.x - n95.x, dy = gate66.y - n95.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newDist = dist * 1.3;
      const scale = newDist / dist;
      // Shift = new_gate_pos - old_gate_pos
      const shiftX = n95.x + dx * scale - gate66.x;
      const shiftY = n95.y + dy * scale - gate66.y;
      // Move entire figure
      const members66 = getFigMembers5k(gate66.id);
      for (const mid of members66) {
        const mn = nodeById(mid);
        if (mn) { mn.x += shiftX; mn.y += shiftY; }
      }
      console.log(`    dist ${dist.toFixed(1)} → ${newDist.toFixed(1)}, shifted ${members66.length} nodes by (${Math.round(shiftX)},${Math.round(shiftY)})`);
    }
  }

  // ─── 5k-67: Add 5-node figure above warrior-tendril-m2-d2-s1 (216) ───
  console.log("  5k-67: Add 5-node diamond figure above node 216");
  {
    const parent67 = nodeByNodeId("warrior-tendril-m2-d2-s1");
    if (parent67) {
      const fid67 = nextFigId5k++;
      // Diamond shape going upward (-Y) from parent
      const gatePos = { x: parent67.x, y: parent67.y - 35 };
      const positions = [
        { suffix: "gate",  ...gatePos, type: "figureEntry" as const },
        { suffix: "ks1",   x: gatePos.x,      y: gatePos.y - 25, type: "keystone" as const },
        { suffix: "ks2",   x: gatePos.x - 20,  y: gatePos.y - 50, type: "keystone" as const },
        { suffix: "ks3",   x: gatePos.x + 20,  y: gatePos.y - 50, type: "keystone" as const },
        { suffix: "ks4",   x: gatePos.x,      y: gatePos.y - 75, type: "keystone" as const },
      ];
      const figNodes67: number[] = [];
      for (const p of positions) {
        const id = nextId5k++;
        nodes.push({
          id, nodeId: `warrior-fig-m2d2fig-${p.suffix}`,
          x: p.x, y: p.y,
          type: p.type,
          connections: [],
          stats: {},
        } as any);
        figMembership.push([id, fid67]);
        figNodes67.push(id);
      }
      const [gateId, ks1, ks2, ks3, ks4] = figNodes67;
      // Connect to parent tree
      addEdge(parent67.id, gateId);
      // Figure internal edges: gate→ks1, ks1→ks2, ks1→ks3, ks2→ks4, ks3→ks4
      addEdge(gateId, ks1); addFigureEdge(gateId, ks1);
      addEdge(ks1, ks2);    addFigureEdge(ks1, ks2);
      addEdge(ks1, ks3);    addFigureEdge(ks1, ks3);
      addEdge(ks2, ks4);    addFigureEdge(ks2, ks4);
      addEdge(ks3, ks4);    addFigureEdge(ks3, ks4);

      console.log(`    Created ${figNodes67.length} nodes at gate(${Math.round(gatePos.x)},${Math.round(gatePos.y)}), figId=${fid67}`);
    }
  }

  console.log("  5k: Done.");
}

// ═══════════════════════════════════════════════════════════════
// PHASE 6: Validation
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 6: Validation ===");

// Check all edges reference existing nodes
const nodeIds = new Set(nodes.map((n) => n.id));
let edgeErrors = 0;
for (const [a, b] of edges) {
  if (!nodeIds.has(a) || !nodeIds.has(b)) {
    console.error(`  Edge [${a},${b}] references missing node!`);
    edgeErrors++;
  }
}

// Check connections consistency
let connErrors = 0;
for (const n of nodes) {
  for (const c of n.connections) {
    if (!nodeIds.has(c)) {
      console.error(`  Node ${n.id} has connection to missing node ${c}`);
      connErrors++;
    }
  }
}

// Check figure membership
let fmErrors = 0;
for (const [nid, fid] of figMembership) {
  if (!nodeIds.has(nid)) {
    console.error(`  Figure membership: node ${nid} not found`);
    fmErrors++;
  }
}

// Check figure edges
let feErrors = 0;
for (const e of figEdges) {
  const [a, b] = e.split("-").map(Number);
  if (!nodeIds.has(a) || !nodeIds.has(b)) {
    console.error(`  Figure edge ${e} references missing node`);
    feErrors++;
  }
}

// BFS connectivity check
{
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
      if (!visited.has(nb)) {
        visited.add(nb);
        q.push(nb);
      }
    }
  }
  if (visited.size !== nodes.length) {
    console.error(
      `  BFS: only ${visited.size}/${nodes.length} nodes reachable!`,
    );
    const unreachable = nodes
      .filter((n) => !visited.has(n.id))
      .map((n) => `${n.id}(${n.nodeId})`);
    console.error(`  Unreachable: ${unreachable.join(", ")}`);
  } else {
    console.log(`  BFS: ${visited.size}/${nodes.length} nodes reachable ✓`);
  }
}

// Check for crossings
{
  function segsCross(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
  ): boolean {
    const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
    if (Math.abs(d) < 1e-10) return false;
    const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
    const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
    return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  let crossings = 0;
  for (let i = 0; i < edges.length; i++) {
    const [a1, b1] = edges[i];
    const na1 = nodeMap.get(a1);
    const nb1 = nodeMap.get(b1);
    if (!na1 || !nb1) continue;
    for (let j = i + 1; j < edges.length; j++) {
      const [a2, b2] = edges[j];
      // Skip if edges share a node
      if (a1 === a2 || a1 === b2 || b1 === a2 || b1 === b2) continue;
      const na2 = nodeMap.get(a2);
      const nb2 = nodeMap.get(b2);
      if (!na2 || !nb2) continue;
      if (segsCross(na1.x, na1.y, nb1.x, nb1.y, na2.x, na2.y, nb2.x, nb2.y)) {
        crossings++;
        if (crossings <= 10) {
          console.warn(
            `  Crossing: [${a1},${b1}] (${na1.nodeId}↔${nb1.nodeId}) × [${a2},${b2}] (${na2.nodeId}↔${nb2.nodeId})`,
          );
        }
      }
    }
  }
  console.log(`  Edge crossings: ${crossings}`);
}

// Check min distances
{
  let tooClose = 0;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20) {
        tooClose++;
        if (tooClose <= 5)
          console.warn(
            `  Too close: ${nodes[i].id}↔${nodes[j].id} = ${dist.toFixed(1)}px`,
          );
      }
    }
  }
  console.log(`  Pairs < 20px: ${tooClose}`);
}

console.log(
  `\n  Errors: edges=${edgeErrors}, conn=${connErrors}, fm=${fmErrors}, fe=${feErrors}`,
);

if (edgeErrors + connErrors + fmErrors + feErrors > 0) {
  console.error("\n!!! Validation errors found. Fixing...");

  // Auto-fix: clean invalid connections
  for (const n of nodes) {
    n.connections = n.connections.filter((c) => nodeIds.has(c));
  }

  // Auto-fix: clean invalid edges
  edges = edges.filter(([a, b]) => nodeIds.has(a) && nodeIds.has(b));

  // Auto-fix: clean invalid figure edges
  figEdges = figEdges.filter((e) => {
    const [a, b] = e.split("-").map(Number);
    return nodeIds.has(a) && nodeIds.has(b);
  });

  // Auto-fix: clean invalid figure membership
  figMembership = figMembership.filter(([nid]) => nodeIds.has(nid));

  console.log("  Auto-fixed invalid references");
}

// ═══════════════════════════════════════════════════════════════
// PHASE 6b: Re-index node IDs to be sequential (0..N-1)
// The FE uses nodes[id] array indexing, so IDs must match indices.
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 6b: Re-indexing node IDs ===");
{
  // Sort nodes by original ID to maintain order
  nodes.sort((a, b) => a.id - b.id);

  // Build old→new ID mapping
  const idMap = new Map<number, number>();
  for (let i = 0; i < nodes.length; i++) {
    idMap.set(nodes[i].id, i);
  }

  // Remap node IDs and connections
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].id = i;
    nodes[i].connections = nodes[i].connections.map((c) => idMap.get(c)!).filter((c) => c !== undefined);
  }

  // Remap edges
  edges = edges.map(([a, b]) => [idMap.get(a)!, idMap.get(b)!]);

  // Remap figure edges
  figEdges = figEdges.map((e) => {
    const [a, b] = e.split("-").map(Number);
    return `${idMap.get(a)!}-${idMap.get(b)!}`;
  });

  // Remap figure membership
  figMembership = figMembership.map(([nid, fid]) => [idMap.get(nid)!, fid]);

  // Remap emblem startNodeIds
  for (const emb of emblems) {
    if (idMap.has(emb.startNodeId)) {
      emb.startNodeId = idMap.get(emb.startNodeId)!;
    }
  }

  console.log(`  Re-indexed ${idMap.size} nodes to 0..${nodes.length - 1}`);
}

// ═══════════════════════════════════════════════════════════════
// PHASE 7: Write output
// ═══════════════════════════════════════════════════════════════

console.log("\n=== PHASE 7: Writing output ===");

// Round coordinates
for (const n of nodes) {
  n.x = Math.round(n.x * 100) / 100;
  n.y = Math.round(n.y * 100) / 100;
}

const output = `/**
 * Pre-computed skill tree data — generated by generate-tree.ts
 *
 * DO NOT EDIT MANUALLY. Regenerate: npx tsx shared/generate-tree.ts
 *
 * Patched: ${new Date().toISOString()}
 * Nodes: ${nodes.length}
 * Edges: ${edges.length}
 */

/* eslint-disable */

export interface RawNode {
  id: number;
  nodeId: string;
  type: string;
  classAffinity: string;
  x: number;
  y: number;
  label: string;
  name: string | null;
  stat: string | null;
  value: number;
  defId: string | null;
  activeSkillId?: string | null;
  mods: { stat: string; value: number; mode: string }[];
  connections: number[];
  connector: boolean;
}

export const TREE_NODES: RawNode[] = ${JSON.stringify(nodes)};

export const TREE_EDGES: [number, number][] = ${JSON.stringify(edges)};

export const TREE_EMBLEMS: { classId: string; cx: number; cy: number; r: number; img: string; startNodeId: number }[] = ${JSON.stringify(emblems)};

export const TREE_FIGURE_EDGES: string[] = ${JSON.stringify(figEdges)};

export const TREE_FIGURE_MEMBERSHIP: [number, number][] = ${JSON.stringify(figMembership)};
`;

fs.writeFileSync(dataPath, output, "utf-8");
console.log(`\nWritten ${dataPath}`);
console.log(`  Nodes: ${nodes.length}`);
console.log(`  Edges: ${edges.length}`);
console.log(`  Figure edges: ${figEdges.length}`);
console.log(`  Figure membership: ${figMembership.length}`);
