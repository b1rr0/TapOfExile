/**
 * check-figures.ts
 * Checks all ConstellationShape definitions for:
 *  1. Self-crossing edges (edges within the same figure that cross each other)
 *  2. Out-of-bounds point indices in edges
 *  3. Duplicate edges
 *  4. Self-loops
 *
 * Run: npx tsx shared/check-figures.ts
 */

interface ConstellationShape {
  name: string;
  points: [number, number][];
  edges: [number, number][];
  gatewayIdx?: number;
}

// ── Geometry ─────────────────────────────────────────────

function cross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function onSeg(ax: number, ay: number, bx: number, by: number, px: number, py: number): boolean {
  return Math.min(ax, bx) <= px + 1e-9 && px <= Math.max(ax, bx) + 1e-9 &&
         Math.min(ay, by) <= py + 1e-9 && py <= Math.max(ay, by) + 1e-9;
}

function segsCross(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number,
): boolean {
  // skip shared endpoints
  if ((x1 === x3 && y1 === y3) || (x1 === x4 && y1 === y4) ||
      (x2 === x3 && y2 === y3) || (x2 === x4 && y2 === y4)) return false;
  const d1 = cross(x3, y3, x4, y4, x1, y1);
  const d2 = cross(x3, y3, x4, y4, x2, y2);
  const d3 = cross(x1, y1, x2, y2, x3, y3);
  const d4 = cross(x1, y1, x2, y2, x4, y4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  if (d1 === 0 && onSeg(x3, y3, x4, y4, x1, y1)) return true;
  if (d2 === 0 && onSeg(x3, y3, x4, y4, x2, y2)) return true;
  if (d3 === 0 && onSeg(x1, y1, x2, y2, x3, y3)) return true;
  if (d4 === 0 && onSeg(x1, y1, x2, y2, x4, y4)) return true;
  return false;
}

// ── Shape definitions (copy from skill-tree.ts) ──────────

const INNER_SHAPES: ConstellationShape[] = [
  { name: "pentagon5", points: [[2,0],[4,1],[3,4],[1,4],[0,1]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,0]], gatewayIdx: 0 },
  { name: "hexagon", points: [[0,2],[1,0],[3,0],[4,2],[3,4],[1,4]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]], gatewayIdx: 0 },
  { name: "cluster6", points: [[2,2],[2,4],[4,2],[2,0],[0,2],[3,3]],
    edges: [[0,1],[0,2],[0,3],[0,4],[0,5]], gatewayIdx: 0 },
  { name: "twoTri6", points: [[0,0],[2,0],[1,2],[3,0],[5,0],[4,2]],
    edges: [[0,1],[1,2],[2,0],[1,3],[3,4],[4,5],[5,3]], gatewayIdx: 1 },
];

const OUTER_SHAPES: ConstellationShape[] = [
  { name: "tree7", points: [[0,0],[0,2],[-1,3],[1,3],[-2,4],[0,4],[2,4]],
    edges: [[0,1],[1,2],[1,3],[2,4],[3,5],[3,6]], gatewayIdx: 0 },
  { name: "pentTail7", points: [[0,2],[1,0],[3,0],[4,2],[2,4],[5,3],[6,4]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,0],[3,5],[5,6]], gatewayIdx: 0 },
  { name: "graph8", points: [[0,0],[2,0],[3,1],[2,2],[0,2],[-1,1],[1,3],[3,3]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[3,6],[2,7]], gatewayIdx: 5 },
  { name: "dblDiamond8", points: [[0,2],[2,0],[4,2],[2,4],[6,2],[8,0],[10,2],[8,4]],
    edges: [[0,1],[1,2],[2,3],[3,0],[2,4],[4,5],[5,6],[6,7],[7,4]], gatewayIdx: 0 },
  { name: "octagon8", points: [[0,1],[1,0],[3,0],[4,1],[4,3],[3,4],[1,4],[0,3]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0]], gatewayIdx: 7 },
  { name: "zigzag9", points: [[0,0],[1,1],[2,0],[3,1],[4,0],[5,1],[6,0],[7,1],[8,0]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]], gatewayIdx: 0 },
  { name: "spiral9", points: [[0,0],[4,0],[4,4],[0,4],[0,1],[3,1],[3,3],[1,3],[1,2]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]], gatewayIdx: 0 },
  { name: "cross9", points: [[0,2],[2,2],[4,2],[2,0],[2,4],[2,6],[0,0],[4,0],[0,4]],
    edges: [[0,1],[1,2],[3,1],[1,4],[4,5],[6,1],[1,7],[4,8]], gatewayIdx: 3 },
  { name: "circle10", points: [[0,3],[2,5],[4,5],[6,3],[6,1],[4,-1],[2,-1],[0,1],[1,3],[5,3]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[0,8],[8,9],[9,3]], gatewayIdx: 7 },
  { name: "tree10", points: [[0,0],[-2,2],[2,2],[-3,4],[-1,4],[1,4],[3,4],[-3,6],[-1,6],[1,6]],
    edges: [[0,1],[0,2],[1,3],[1,4],[2,5],[2,6],[3,7],[4,8],[5,9]], gatewayIdx: 0 },
  { name: "complex10", points: [[0,0],[2,1],[4,0],[5,2],[4,4],[2,5],[0,4],[-1,2],[2,3],[3,2]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[1,9],[5,8]], gatewayIdx: 7 },
];

// ── Checker ───────────────────────────────────────────────

interface ShapeError {
  type: string;
  detail: string;
}

function checkShape(s: ConstellationShape, tier: string): ShapeError[] {
  const errors: ShapeError[] = [];
  const N = s.points.length;

  // 1. Out-of-bounds indices
  for (const [i, j] of s.edges) {
    if (i < 0 || i >= N) errors.push({ type: "OOB", detail: `edge [${i},${j}]: index ${i} out of bounds (0..${N-1})` });
    if (j < 0 || j >= N) errors.push({ type: "OOB", detail: `edge [${i},${j}]: index ${j} out of bounds (0..${N-1})` });
  }

  // 2. Self-loops
  for (const [i, j] of s.edges) {
    if (i === j) errors.push({ type: "LOOP", detail: `self-loop on vertex ${i}` });
  }

  // 3. Duplicate edges
  const seen = new Set<string>();
  for (const [i, j] of s.edges) {
    const key = `${Math.min(i,j)}-${Math.max(i,j)}`;
    if (seen.has(key)) errors.push({ type: "DUP", detail: `duplicate edge [${i},${j}]` });
    seen.add(key);
  }

  // 4. Invalid gatewayIdx
  if (s.gatewayIdx !== undefined && (s.gatewayIdx < 0 || s.gatewayIdx >= N)) {
    errors.push({ type: "GW", detail: `gatewayIdx=${s.gatewayIdx} out of bounds` });
  }

  // 5. Self-crossing edges (any pair of edges that cross)
  for (let i = 0; i < s.edges.length; i++) {
    const [ai, bi] = s.edges[i];
    if (ai >= N || bi >= N) continue;
    const [ax, ay] = s.points[ai];
    const [bx, by] = s.points[bi];
    for (let j = i + 1; j < s.edges.length; j++) {
      const [ci, di] = s.edges[j];
      if (ci >= N || di >= N) continue;
      const [cx, cy] = s.points[ci];
      const [dx, dy] = s.points[di];
      if (segsCross(ax, ay, bx, by, cx, cy, dx, dy)) {
        errors.push({
          type: "CROSS",
          detail: `edge [${ai},${bi}] P(${ax},${ay})→(${bx},${by}) × edge [${ci},${di}] P(${cx},${cy})→(${dx},${dy})`,
        });
      }
    }
  }

  // 6. Check collinear endpoint - a vertex of one edge lies ON another edge
  // (weaker than crossing but still visually bad: T-junction or degenerate overlap)
  const collinearHits = new Set<string>();
  for (let i = 0; i < s.edges.length; i++) {
    const [ai, bi] = s.edges[i];
    if (ai >= N || bi >= N) continue;
    const [ax, ay] = s.points[ai];
    const [bx, by] = s.points[bi];
    for (let j = 0; j < s.edges.length; j++) {
      if (i === j) continue;
      const [ci, di] = s.edges[j];
      if (ci >= N || di >= N) continue;
      // Check both endpoints of edge j against edge i
      for (const [vi, vx_vy] of [[ci, s.points[ci]], [di, s.points[di]]] as [number, [number,number]][]) {
        if (vi === ai || vi === bi) continue;  // skip shared endpoints
        const [vx, vy] = vx_vy;
        const d = cross(ax, ay, bx, by, vx, vy);
        if (Math.abs(d) < 1e-9 && onSeg(ax, ay, bx, by, vx, vy)) {
          const key = `e${i}-v${vi}`;
          if (!collinearHits.has(key)) {
            collinearHits.add(key);
            errors.push({ type: "COLLINEAR", detail: `vertex ${vi} P(${vx},${vy}) lies on edge [${ai},${bi}]` });
          }
        }
      }
    }
  }

  return errors;
}

// ── Main ──────────────────────────────────────────────────

let totalErrors = 0;
let totalOk = 0;

function runGroup(shapes: ConstellationShape[], tier: string): void {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${tier} SHAPES (${shapes.length})`);
  console.log(`${'═'.repeat(60)}`);

  for (const shape of shapes) {
    const errors = checkShape(shape, tier);
    const crossings = errors.filter(e => e.type === "CROSS");
    const collinear = errors.filter(e => e.type === "COLLINEAR");
    const structural = errors.filter(e => !["CROSS","COLLINEAR"].includes(e.type));
    const gwLabel = shape.gatewayIdx !== undefined ? `gw=${shape.gatewayIdx}` : "gw=center";
    const label = `${shape.name} (${shape.points.length}pts, ${shape.edges.length}edges, ${gwLabel})`;

    if (errors.length === 0) {
      console.log(`  ✓ ${label}`);
      totalOk++;
    } else {
      console.log(`  ✗ ${label}`);
      for (const e of structural) {
        console.log(`      [${e.type}] ${e.detail}`);
        totalErrors++;
      }
      for (const e of crossings) {
        console.log(`      [CROSS] ${e.detail}`);
        totalErrors++;
      }
      for (const e of collinear) {
        console.log(`      [COLLINEAR] ${e.detail}`);
        totalErrors++;
      }
    }
  }
}

console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║   CONSTELLATION FIGURE SELF-INTERSECTION CHECK           ║");
console.log("╚══════════════════════════════════════════════════════════╝");

runGroup(INNER_SHAPES, "INNER");
runGroup(OUTER_SHAPES, "OUTER");

console.log(`\n${'═'.repeat(60)}`);
console.log(`SUMMARY: ${totalOk} shapes OK, ${totalErrors} errors found`);
console.log(`${'═'.repeat(60)}\n`);

if (totalErrors > 0) process.exit(1);
