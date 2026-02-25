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
            `  Crossing: [${a1},${b1}] × [${a2},${b2}]`,
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
      if (dist < 10) {
        tooClose++;
        if (tooClose <= 5)
          console.warn(
            `  Too close: ${nodes[i].id}↔${nodes[j].id} = ${dist.toFixed(1)}px`,
          );
      }
    }
  }
  console.log(`  Pairs < 10px: ${tooClose}`);
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
