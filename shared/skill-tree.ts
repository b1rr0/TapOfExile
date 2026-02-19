/**
 * Passive Skill Tree — organic branching circular graph, ~310 nodes.
 *
 * Layout: 4 class starting points at radius 210 at 0/90/180/270.
 * Each start node sits inside a class emblem circle (r=100) with class background image.
 * Inside each emblem — a mini-tree of 16 class-specific skills (max 6 selectable).
 * Outside — compact rings that split into fractal tendrils.
 * Additional mid-ring, web, and cross-bridge nodes fill gaps for density.
 *
 * NOTE: This file is shared between FE and BE.
 * BE uses it for validation (topology); FE also uses layout (x, y) for rendering.
 */

import {
  MINOR_POOL, NOTABLE_POOL, KEYSTONE_POOL, CLASS_SKILLS, NodeDef, StatModifier,
} from "./skill-node-defs";
import type { NodeType } from "./types";

// ── Emblem type (inline, no dependency on FE types) ──────

export interface Emblem {
  classId: string;
  cx: number;
  cy: number;
  r: number;
  img: string;
  startNodeId: number;
}

export interface SkillTreeResult {
  nodes: SkillNode[];
  edges: [number, number][];
  emblems: Emblem[];
}

// ── Seeded random ─────────────────────────────────────────

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Constants ─────────────────────────────────────────────

const CX: number = 800;
const CY: number = 800;
export const CLASS_IDS: string[] = ["samurai", "warrior", "mage", "archer"];
const CLASS_ANGLE: Record<string, number> = { samurai: 0, warrior: Math.PI / 2, mage: Math.PI, archer: (3 * Math.PI) / 2 };

const START_RADIUS: number = 210;
export const EMBLEM_RADIUS: number = 100;
export const MAX_CLASS_SKILLS: number = 6;

// Node rendering radii (shared between FE, wiki, and layout validation)
export const NODE_RADIUS: Record<string, number> = {
  keystone: 16, notable: 12, start: 14, classSkill: 9, minor: 8,
};
// Minimum distance = 4× diameter = 8× radius
const MIN_DIST_MULT: number = 8;

// Class emblem background images (used by FE & wiki)
export const CLASS_IMG: Record<string, string> = {
  samurai: "skiiltree/samurai.png",
  warrior: "skiiltree/warrior.png",
  mage:    "skiiltree/mage.png",
  archer:  "skiiltree/archer.png",
};

// ── SkillNode ─────────────────────────────────────────────

export class SkillNode {
  id: number;
  nodeId: string;
  type: NodeType;
  classAffinity: string;
  x: number;
  y: number;
  label: string;
  name: string | null;
  stat: string | null;
  value: number;
  def: NodeDef | null;
  mods: StatModifier[];
  connections: number[];

  constructor(
    id: number,
    nodeId: string,
    type: NodeType,
    classAffinity: string,
    x: number,
    y: number,
    data: NodeDef | { label: string; name?: string | null; stat?: string | null; value?: number },
  ) {
    this.id = id;
    this.nodeId = nodeId;
    this.type = type;
    this.classAffinity = classAffinity;
    this.x = x;
    this.y = y;

    // Display fields (backward compat with scene tooltip)
    this.label = data.label;
    this.name = (data as any).name || null;
    this.stat = (data as any).stat || null;
    this.value = (data as any).value || 0;

    // OOP: NodeDef reference + modifiers array for stat computation
    this.def = (data instanceof NodeDef) ? data : null;
    this.mods = (data instanceof NodeDef) ? data.mods : [];

    this.connections = [];
  }
}

// ── SkillTreeBuilder ──────────────────────────────────────

export class SkillTreeBuilder {
  nodes: SkillNode[];
  edges: [number, number][];
  emblems: Emblem[];
  _nextId: number;
  _minorIdx: number;
  _notableIdx: number;
  _keystoneIdx: number;
  _rng: () => number;

  constructor() {
    this.nodes = [];
    this.edges = [];
    this.emblems = [];
    this._nextId = 0;
    this._minorIdx = 0;
    this._notableIdx = 0;
    this._keystoneIdx = 0;
    this._rng = seededRng(42);
  }

  // ── Node creation ──────────────────────────────────

  createNode(
    nodeId: string,
    type: NodeType,
    cls: string,
    x: number,
    y: number,
    data: NodeDef | { label: string; name?: string | null; stat?: string | null; value?: number },
  ): SkillNode {
    const node = new SkillNode(this._nextId++, nodeId, type, cls, x, y, data);
    this.nodes.push(node);
    return node;
  }

  nextMinor(): NodeDef    { return MINOR_POOL[this._minorIdx++ % MINOR_POOL.length]; }
  nextNotable(): NodeDef  { return NOTABLE_POOL[this._notableIdx++ % NOTABLE_POOL.length]; }
  nextKeystone(): NodeDef { return KEYSTONE_POOL[this._keystoneIdx++ % KEYSTONE_POOL.length]; }

  // ── Edge creation ──────────────────────────────────

  link(a: SkillNode, b: SkillNode): void {
    if (a.connections.includes(b.id)) return;
    a.connections.push(b.id);
    b.connections.push(a.id);
    this.edges.push([a.id, b.id]);
  }

  // ── Helpers ────────────────────────────────────────

  jit(v: number, amt: number): number { return v + (this._rng() - 0.5) * amt; }

  polar(angle: number, r: number): [number, number] {
    return [CX + Math.cos(angle) * r, CY + Math.sin(angle) * r];
  }

  rng(): number { return this._rng(); }

  // ── Emblem registration ────────────────────────────

  addEmblem(classId: string, cx: number, cy: number, startNodeId: number): void {
    this.emblems.push({
      classId, cx, cy,
      r: EMBLEM_RADIUS,
      img: CLASS_IMG[classId],
      startNodeId,
    });
  }

  // ── Result ─────────────────────────────────────────

  build(): SkillTreeResult {
    return { nodes: this.nodes, edges: this.edges, emblems: this.emblems };
  }
}

// ── Geometry helpers ──────────────────────────────────────

function cross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function onSeg(ax: number, ay: number, bx: number, by: number, px: number, py: number): boolean {
  return Math.min(ax, bx) <= px + 1e-9 && px <= Math.max(ax, bx) + 1e-9 &&
         Math.min(ay, by) <= py + 1e-9 && py <= Math.max(ay, by) + 1e-9;
}

/** True if segments (x1,y1)-(x2,y2) and (x3,y3)-(x4,y4) properly intersect. Shared endpoints ignored. */
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

// ── Post-build layout relaxation ─────────────────────────

function nodeR(type: string): number { return NODE_RADIUS[type] || 8; }

/** True if node is part of the outer (non-emblem) tree */
function isOuter(n: SkillNode): boolean {
  return n.type !== "start" && n.type !== "classSkill";
}

/** True if edge is in the outer tree (both endpoints are outer nodes) */
function isOuterEdge(nodes: SkillNode[], aId: number, bId: number): boolean {
  return isOuter(nodes[aId]) && isOuter(nodes[bId]);
}

/**
 * Filter edges to only those in the outer tree (excludes classSkill/start edges).
 */
function outerEdges(nodes: SkillNode[], edges: [number, number][]): [number, number][] {
  return edges.filter(([a, b]) => isOuterEdge(nodes, a, b));
}

/**
 * Iteratively adjusts outer-node positions to satisfy:
 *  1. Min distance between outer nodes (4× diameter)
 *  2. No outer-edge crossings
 * classSkill and start nodes are anchored; their edges are excluded from checks.
 */
function relaxLayout(nodes: SkillNode[], edges: [number, number][], maxIter: number): void {
  const N = nodes.length;
  const movable = nodes.map(n => isOuter(n));
  const oEdges = outerEdges(nodes, edges);
  // Outer-node indices for distance checks
  const outerIds: number[] = [];
  for (let i = 0; i < N; i++) if (movable[i]) outerIds.push(i);

  for (let iter = 0; iter < maxIter; iter++) {
    let anyChange = false;
    const dx = new Array<number>(N).fill(0);
    const dy = new Array<number>(N).fill(0);

    // ── 1. Min-distance repulsion (outer nodes only) ──
    for (let ii = 0; ii < outerIds.length; ii++) {
      const i = outerIds[ii];
      for (let jj = ii + 1; jj < outerIds.length; jj++) {
        const j = outerIds[jj];
        const a = nodes[i], b = nodes[j];
        const minD = MIN_DIST_MULT * Math.max(nodeR(a.type), nodeR(b.type));
        const ex = b.x - a.x, ey = b.y - a.y;
        const dist = Math.sqrt(ex * ex + ey * ey);
        if (dist >= minD || dist < 0.01) continue;
        const push = (minD - dist) / 2;
        const nx = (ex / dist) * push, ny = (ey / dist) * push;
        dx[i] -= nx; dy[i] -= ny;
        dx[j] += nx; dy[j] += ny;
        anyChange = true;
      }
    }

    // ── 2. Edge-crossing resolution (outer edges only) ──
    for (let i = 0; i < oEdges.length; i++) {
      const [ai, bi] = oEdges[i];
      for (let j = i + 1; j < oEdges.length; j++) {
        const [ci, di] = oEdges[j];
        if (ai === ci || ai === di || bi === ci || bi === di) continue;
        const na = nodes[ai], nb = nodes[bi], nc = nodes[ci], nd = nodes[di];
        if (!segsCross(na.x, na.y, nb.x, nb.y, nc.x, nc.y, nd.x, nd.y)) continue;
        // Nudge: push movable endpoints apart via perpendicular + radial forces
        const all = [ai, bi, ci, di];
        for (const t of all) {
          if (!movable[t]) continue;
          const partner = t === ai ? bi : t === bi ? ai : t === ci ? di : ci;
          const edx = nodes[partner].x - nodes[t].x;
          const edy = nodes[partner].y - nodes[t].y;
          const len = Math.sqrt(edx * edx + edy * edy) || 1;
          const sign = ((iter + t) % 2 === 0) ? 1 : -1;
          const force = 15;
          dx[t] += (-edy / len) * force * sign;
          dy[t] += (edx / len) * force * sign;
        }
        anyChange = true;
      }
    }

    if (!anyChange) break;

    // Apply with damping (decreasing over iterations for convergence)
    const damp = 0.5 * (1 - iter / (maxIter * 2));
    for (let i = 0; i < N; i++) {
      if (!movable[i]) continue;
      nodes[i].x += dx[i] * damp;
      nodes[i].y += dy[i] * damp;
    }
  }
}

// ── Validation assertions ────────────────────────────────

function assertNoLeafMinors(nodes: SkillNode[]): void {
  for (const n of nodes) {
    if (n.type === "minor" && n.connections.length <= 1) {
      throw new Error(`Leaf minor: ${n.nodeId} (id ${n.id}) has ${n.connections.length} connections`);
    }
  }
}

function assertNoTriangles(nodes: SkillNode[]): void {
  for (const a of nodes) {
    const conns = a.connections;
    for (let i = 0; i < conns.length; i++) {
      for (let j = i + 1; j < conns.length; j++) {
        if (nodes[conns[i]].connections.includes(conns[j])) {
          throw new Error(`Triangle: ${a.id}-${conns[i]}-${conns[j]}`);
        }
      }
    }
  }
}

/** Only checks outer-tree edges (both endpoints are non-classSkill, non-start). */
function assertNoEdgeCrossings(nodes: SkillNode[], edges: [number, number][]): void {
  const oEdges = outerEdges(nodes, edges);
  for (let i = 0; i < oEdges.length; i++) {
    const [ai, bi] = oEdges[i];
    for (let j = i + 1; j < oEdges.length; j++) {
      const [ci, di] = oEdges[j];
      if (ai === ci || ai === di || bi === ci || bi === di) continue;
      if (segsCross(nodes[ai].x, nodes[ai].y, nodes[bi].x, nodes[bi].y,
                     nodes[ci].x, nodes[ci].y, nodes[di].x, nodes[di].y)) {
        throw new Error(`Edge crossing: ${nodes[ai].nodeId}↔${nodes[bi].nodeId} x ${nodes[ci].nodeId}↔${nodes[di].nodeId}`);
      }
    }
  }
}

/** Only checks outer-tree node pairs. */
function assertMinDistance(nodes: SkillNode[]): void {
  const outer = nodes.filter(n => isOuter(n));
  for (let i = 0; i < outer.length; i++) {
    for (let j = i + 1; j < outer.length; j++) {
      const a = outer[i], b = outer[j];
      const minD = MIN_DIST_MULT * Math.max(nodeR(a.type), nodeR(b.type));
      const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
      if (dist < minD - 0.5) {
        throw new Error(`Too close: ${a.nodeId} & ${b.nodeId} (${dist.toFixed(1)} < ${minD})`);
      }
    }
  }
}

// ── Cached tree (deterministic, built once) ──────────────

let _cachedTree: SkillTreeResult | null = null;

// ── Main builder ──────────────────────────────────────────

export function buildSkillTree(): SkillTreeResult {
  if (_cachedTree) return _cachedTree;

  const b = new SkillTreeBuilder();

  // Helper: grow a fractal tendril from a parent node.
  function growTendril(parent: SkillNode, angle: number, startR: number, depth: number, stemLen: number, cls: string, branchTag: string): void {
    if (depth <= 0) return;
    const step = 55 + b.rng() * 12;
    let prev = parent;
    let r = startR;
    for (let i = 0; i < stemLen; i++) {
      r += step;
      const a = angle + (b.rng() - 0.5) * 0.06;
      const [x, y] = b.polar(a, r);
      const n = b.createNode(
        `${cls}-tendril-${branchTag}-d${depth}-s${i}`,
        "minor", cls, b.jit(x, 3), b.jit(y, 3), b.nextMinor(),
      );
      b.link(prev, n);
      prev = n;
    }
    if (depth === 1) {
      r += step * 0.7;
      const [x, y] = b.polar(angle + (b.rng() - 0.5) * 0.04, r);
      const n = b.createNode(
        `${cls}-tendril-${branchTag}-d${depth}-tip`,
        "notable", cls, b.jit(x, 3), b.jit(y, 3), b.nextNotable(),
      );
      b.link(prev, n);
      return;
    }
    const splay = 0.14 + b.rng() * 0.04;
    growTendril(prev, angle - splay, r, depth - 1, stemLen, cls, `${branchTag}L`);
    growTendril(prev, angle + splay, r, depth - 1, stemLen, cls, `${branchTag}R`);
  }

  // ── 1. Start nodes ─────────────────────────────────────

  const START_OFFSET_ANGLE: Record<string, number> = {
    samurai: -Math.PI / 2,
    warrior:  0,
    mage:     Math.PI / 2,
    archer:   Math.PI,
  };
  const START_OFFSET_R: number = EMBLEM_RADIUS;

  const starts: SkillNode[] = [];
  for (let ci = 0; ci < 4; ci++) {
    const cls = CLASS_IDS[ci];
    const a = CLASS_ANGLE[cls] - Math.PI / 2;
    const [ecx, ecy] = b.polar(a, START_RADIUS);
    const oa = START_OFFSET_ANGLE[cls];
    const sx = ecx + Math.cos(oa) * START_OFFSET_R;
    const sy = ecy + Math.sin(oa) * START_OFFSET_R;
    const n = b.createNode(
      `${cls}-start`, "start", cls, sx, sy,
      { label: cls[0].toUpperCase() + cls.slice(1) },
    );
    starts.push(n);
    b.addEmblem(cls, ecx, ecy, n.id);
  }

  // ── 2. Class skill mini-trees (16 per class = 64) ──────

  for (let ci = 0; ci < 4; ci++) {
    const cls = CLASS_IDS[ci];
    const skills = CLASS_SKILLS[cls];
    const em = b.emblems[ci];
    const ecx = em.cx, ecy = em.cy;
    const startA = START_OFFSET_ANGLE[cls];
    const centerA = startA + Math.PI;
    const fanSpan = Math.PI * 1.4;
    let si = 0;

    function emPolar(angle: number, r: number): [number, number] {
      return [ecx + Math.cos(angle) * r, ecy + Math.sin(angle) * r];
    }

    // Ring 1: 3 nodes
    const r1 = 30;
    const tier1: SkillNode[] = [];
    for (let j = 0; j < 3; j++) {
      const a = centerA + (j - 1) * (fanSpan / 3);
      const [nx, ny] = emPolar(a, r1);
      const n = b.createNode(`${cls}-cs-${si}`, "classSkill", cls, nx, ny, skills[si]);
      si++;
      b.link(starts[ci], n);
      tier1.push(n);
    }

    // Ring 2: 6 nodes
    const r2 = 58;
    const tier2: SkillNode[][] = [];
    for (let j = 0; j < 3; j++) {
      const parentA = centerA + (j - 1) * (fanSpan / 3);
      const pair: SkillNode[] = [];
      for (let k = 0; k < 2; k++) {
        const a = parentA + (k === 0 ? -fanSpan / 8 : fanSpan / 8);
        const [nx, ny] = emPolar(a, r2);
        const n = b.createNode(`${cls}-cs-${si}`, "classSkill", cls, nx, ny, skills[si]);
        si++;
        b.link(tier1[j], n);
        pair.push(n);
      }
      tier2.push(pair);
    }

    // Ring 3: 7 nodes
    const r3 = 82;
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 2; k++) {
        if (si >= 16) break;
        const parent = tier2[j][k];
        const parentA = Math.atan2(parent.y - ecy, parent.x - ecx);
        const [nx, ny] = emPolar(parentA, r3);
        const n = b.createNode(`${cls}-cs-${si}`, "classSkill", cls, nx, ny, skills[si]);
        si++;
        b.link(parent, n);
      }
    }
    if (si < 16) {
      const [nx, ny] = emPolar(centerA, r3);
      const n = b.createNode(`${cls}-cs-${si}`, "classSkill", cls, nx, ny, skills[si]);
      si++;
      b.link(tier2[1][0], n);
      b.link(tier2[1][1], n);
    }
  }

  // ── 3. Inner ring — 3 per class (12) ──────────────────

  const R0 = START_RADIUS + EMBLEM_RADIUS;
  const innerRing: SkillNode[][] = [];
  for (let ci = 0; ci < 4; ci++) {
    const cls = CLASS_IDS[ci];
    const base = CLASS_ANGLE[cls] - Math.PI / 2;
    const sn: SkillNode[] = [];
    for (let j = 0; j < 3; j++) {
      const a = base + (j - 1) * 0.30;
      const [x, y] = b.polar(a, R0 + 45 + (b.rng() - 0.5) * 6);
      const n = b.createNode(
        `${cls}-inner-${j}`, "minor", cls,
        b.jit(x, 3), b.jit(y, 3), b.nextMinor(),
      );
      b.link(starts[ci], n);
      sn.push(n);
    }
    innerRing.push(sn);
  }

  // ── 4. Trunk — 5 per class (20) ──────────────────────

  const trunkRing: SkillNode[][] = [];
  for (let ci = 0; ci < 4; ci++) {
    const cls = CLASS_IDS[ci];
    const base = CLASS_ANGLE[cls] - Math.PI / 2;
    const sn: SkillNode[] = [];
    for (let j = 0; j < 5; j++) {
      const a = base + (j - 2) * 0.21;
      const [x, y] = b.polar(a, R0 + 115 + (b.rng() - 0.5) * 8);
      const isN = j === 2;
      const n = isN
        ? b.createNode(`${cls}-trunk-${j}`, "notable", cls, b.jit(x, 3), b.jit(y, 3), b.nextNotable())
        : b.createNode(`${cls}-trunk-${j}`, "minor", cls, b.jit(x, 4), b.jit(y, 4), b.nextMinor());
      b.link(innerRing[ci][Math.min(Math.floor(j * 3 / 5), 2)], n);
      sn.push(n);
    }
    trunkRing.push(sn);
  }

  // ── 5. Branch ring — 5 per class (20) ────────────────

  const branchRing: SkillNode[][] = [];
  for (let ci = 0; ci < 4; ci++) {
    const cls = CLASS_IDS[ci];
    const base = CLASS_ANGLE[cls] - Math.PI / 2;
    const sn: SkillNode[] = [];
    for (let j = 0; j < 5; j++) {
      const a = base + (j - 2) * 0.22;
      const [x, y] = b.polar(a, R0 + 195 + (b.rng() - 0.5) * 10);
      const isN = j === 1 || j === 3;
      const n = isN
        ? b.createNode(`${cls}-branch-${j}`, "notable", cls, b.jit(x, 4), b.jit(y, 4), b.nextNotable())
        : b.createNode(`${cls}-branch-${j}`, "minor", cls, b.jit(x, 5), b.jit(y, 5), b.nextMinor());
      b.link(trunkRing[ci][Math.min(Math.floor(j * 5 / 5), 4)], n);
      sn.push(n);
    }
    branchRing.push(sn);
  }

  // ── 6. Fractal tendrils — 5 roots per class ──────────

  for (let ci = 0; ci < 4; ci++) {
    const cls = CLASS_IDS[ci];
    const base = CLASS_ANGLE[cls] - Math.PI / 2;

    for (let t = 0; t < 3; t++) {
      const a = base + (t - 1) * 0.44;
      const parent = branchRing[ci][[0, 2, 4][t]];
      const pr = Math.sqrt((parent.x - CX) ** 2 + (parent.y - CY) ** 2);
      growTendril(parent, a, pr, 2, 2, cls, `m${t}`);
    }

    for (let t = 0; t < 2; t++) {
      const a = base + (t === 0 ? -0.68 : 0.68);
      const parent = branchRing[ci][t === 0 ? 0 : 4];
      const pr = Math.sqrt((parent.x - CX) ** 2 + (parent.y - CY) ** 2);
      growTendril(parent, a, pr, 1, 3, cls, `s${t}`);
    }
  }

  // ── 7. Keystones at furthest tips ────────────────────

  for (let ci = 0; ci < 4; ci++) {
    const cls = CLASS_IDS[ci];
    const base = CLASS_ANGLE[cls] - Math.PI / 2;
    for (let j = 0; j < 2; j++) {
      const a = base + (j === 0 ? -0.42 : 0.42);
      const [x, y] = b.polar(a, R0 + 520 + (b.rng() - 0.5) * 10);
      const ks = b.createNode(
        `${cls}-keystone-${j}`, "keystone", cls, x, y, b.nextKeystone(),
      );
      let best: SkillNode | null = null, bestD = Infinity;
      for (const n of b.nodes) {
        if (n.type === "keystone" || n.type === "classSkill" || n.type === "start") continue;
        if (n.classAffinity !== cls) continue;
        const d = (n.x - ks.x) ** 2 + (n.y - ks.y) ** 2;
        if (d < bestD) { bestD = d; best = n; }
      }
      if (best) b.link(best, ks);
    }
  }

  // ── 8. Mid-ring filler — 3 per class (12) ──────────
  //  Placed between trunk and branch, linking the two layers with extra paths.
  //  Trunk/branch pairings offset to avoid triangles (branch[j]↔trunk[j] already exists).

  const midRing: SkillNode[][] = [];
  for (let ci = 0; ci < 4; ci++) {
    const cls = CLASS_IDS[ci];
    const base = CLASS_ANGLE[cls] - Math.PI / 2;
    const sn: SkillNode[] = [];
    // Place mid nodes between trunk[j] and branch[j+1] angles to avoid crossing
    // trunk↔branch radials. Each mid node sits offset from trunk-branch center line.
    // mid[0] between trunk[0] and trunk[1] → angle closer to trunk[0]
    // mid[1] between trunk[1] and trunk[2] → angle closer to trunk[1]
    // mid[2] between trunk[3] and trunk[4] → angle closer to trunk[4]
    const midAngles = [-0.32, -0.11, 0.32];
    const midTrunk  = [0, 1, 4];
    const midBranch = [1, 2, 3];
    for (let j = 0; j < 3; j++) {
      const a = base + midAngles[j];
      const [x, y] = b.polar(a, R0 + 155 + (b.rng() - 0.5) * 8);
      const n = b.createNode(
        `${cls}-mid-${j}`, "minor", cls,
        b.jit(x, 4), b.jit(y, 4), b.nextMinor(),
      );
      b.link(trunkRing[ci][midTrunk[j]], n);
      b.link(n, branchRing[ci][midBranch[j]]);
      sn.push(n);
    }
    // No mid-mid horizontal links — they cross trunk↔branch radial edges.
    midRing.push(sn);
  }

  // ── 9. Branch web — 2 per class (8) ───────────────
  //  Short-circuit paths between adjacent branch ring nodes.

  const branchWeb: SkillNode[][] = [];
  for (let ci = 0; ci < 4; ci++) {
    const cls = CLASS_IDS[ci];
    const base = CLASS_ANGLE[cls] - Math.PI / 2;
    const sn: SkillNode[] = [];
    for (let j = 0; j < 2; j++) {
      const a = base + (j === 0 ? -0.15 : 0.15);
      const [x, y] = b.polar(a, R0 + 215 + (b.rng() - 0.5) * 8);
      const n = b.createNode(
        `${cls}-web-${j}`, "minor", cls,
        b.jit(x, 4), b.jit(y, 4), b.nextMinor(),
      );
      // connect to two adjacent branch ring nodes
      b.link(branchRing[ci][j === 0 ? 1 : 3], n);
      b.link(branchRing[ci][2], n);
      sn.push(n);
    }
    branchWeb.push(sn);
  }

  // ── 10. Extended side paths — 3 per class (12) ────
  //  Extra paths branching off the outer tendrils.
  //  Minor nodes (j=0,2) get two connections to avoid being leaf nodes.

  for (let ci = 0; ci < 4; ci++) {
    const cls = CLASS_IDS[ci];
    const base = CLASS_ANGLE[cls] - Math.PI / 2;
    // Ext angles: ±0.56 for sides (between main tendrils and side tendrils), 0 for center
    const extAngles = [-0.56, 0, 0.56];
    for (let j = 0; j < 3; j++) {
      const a = base + extAngles[j];
      const [x, y] = b.polar(a, R0 + 340 + (b.rng() - 0.5) * 12);
      const isN = j === 1;
      const n = isN
        ? b.createNode(`${cls}-ext-${j}`, "notable", cls, b.jit(x, 4), b.jit(y, 4), b.nextNotable())
        : b.createNode(`${cls}-ext-${j}`, "minor", cls, b.jit(x, 5), b.jit(y, 5), b.nextMinor());
      // Collect nearest eligible same-class nodes, sorted by distance
      const candidates: { node: SkillNode; dist: number }[] = [];
      for (const nd of b.nodes) {
        if (nd === n) continue;
        if (nd.type === "keystone" || nd.type === "classSkill" || nd.type === "start") continue;
        if (nd.classAffinity !== cls) continue;
        const d = (nd.x - n.x) ** 2 + (nd.y - n.y) ** 2;
        candidates.push({ node: nd, dist: d });
      }
      candidates.sort((ca, cb) => ca.dist - cb.dist);
      // Link to nearest
      if (candidates.length > 0) b.link(candidates[0].node, n);
      // Minor nodes: add second link (no triangle with first)
      if (!isN) {
        for (let k = 1; k < candidates.length; k++) {
          if (!candidates[0].node.connections.includes(candidates[k].node.id)) {
            b.link(candidates[k].node, n);
            break;
          }
        }
      }
    }
  }

  // ── 11. Cross-class bridges (enhanced) ─────────────
  //  Instead of a direct trunk→trunk link, add 2 intermediary nodes per bridge (8 total)
  //  plus keep the trunk link for redundancy.

  const bridgeNodes: SkillNode[][] = [];
  for (let ci = 0; ci < 4; ci++) {
    const next = (ci + 1) % 4;
    const cls = CLASS_IDS[ci];
    const nextCls = CLASS_IDS[next];

    const aA = CLASS_ANGLE[cls] - Math.PI / 2;
    const aB = CLASS_ANGLE[nextCls] - Math.PI / 2;
    const midAngle = (aA + aB) / 2;
    // if the angle wraps, fix it
    const correctedMid = Math.abs(aA - aB) > Math.PI
      ? midAngle + Math.PI
      : midAngle;

    const bridgePair: SkillNode[] = [];
    for (let j = 0; j < 2; j++) {
      const t = j === 0 ? 0.35 : 0.65;
      const a = aA + (correctedMid - aA) * (j === 0 ? 0.7 : 1.3);
      const [x, y] = b.polar(a, R0 + 130 + (b.rng() - 0.5) * 12);
      const affinity = j === 0 ? cls : nextCls;
      const n = b.createNode(
        `bridge-${cls}-${nextCls}-${j}`, "minor", affinity,
        b.jit(x, 5), b.jit(y, 5), b.nextMinor(),
      );
      bridgePair.push(n);
    }
    // link: trunkA[4] → bridge0 → bridge1 → trunkB[0]
    b.link(trunkRing[ci][4], bridgePair[0]);
    b.link(bridgePair[0], bridgePair[1]);
    b.link(bridgePair[1], trunkRing[next][0]);
    // also keep the direct trunk bridge
    b.link(trunkRing[ci][4], trunkRing[next][0]);
    bridgeNodes.push(bridgePair);
  }

  // ── 12. Outer arc connectors — notable hubs between classes (4) ──
  //  One notable node per class boundary at the outer ring, connecting
  //  the outermost branch nodes of adjacent classes.

  for (let ci = 0; ci < 4; ci++) {
    const next = (ci + 1) % 4;
    const cls = CLASS_IDS[ci];
    const nextCls = CLASS_IDS[next];

    const aA = CLASS_ANGLE[cls] - Math.PI / 2;
    const aB = CLASS_ANGLE[nextCls] - Math.PI / 2;
    let midA = (aA + aB) / 2;
    if (Math.abs(aA - aB) > Math.PI) midA += Math.PI;

    const [x, y] = b.polar(midA, R0 + 260 + (b.rng() - 0.5) * 10);
    const n = b.createNode(
      `arc-${cls}-${nextCls}`, "notable", cls,
      b.jit(x, 4), b.jit(y, 4), b.nextNotable(),
    );
    // link to nearest branch-tier nodes of each class
    b.link(branchRing[ci][4], n);
    b.link(branchRing[next][0], n);
  }

  // ── 13. Inner web — 2 per class (8) ──
  //  Extra density between inner ring and trunk.
  //  Trunk targets chosen to avoid triangles: inner[0]↔trunk[0] and
  //  inner[2]↔trunk[4] already exist, so we use trunk[2] and trunk[3].

  for (let ci = 0; ci < 4; ci++) {
    const cls = CLASS_IDS[ci];
    const base = CLASS_ANGLE[cls] - Math.PI / 2;
    for (let j = 0; j < 2; j++) {
      const a = base + (j === 0 ? -0.18 : 0.18);
      const [x, y] = b.polar(a, R0 + 78 + (b.rng() - 0.5) * 6);
      const n = b.createNode(
        `${cls}-iweb-${j}`, "minor", cls,
        b.jit(x, 3), b.jit(y, 3), b.nextMinor(),
      );
      b.link(innerRing[ci][j === 0 ? 0 : 2], n);
      b.link(n, trunkRing[ci][j === 0 ? 2 : 3]);
    }
  }

  // ── Post-build: layout relaxation + validation ─────────

  relaxLayout(b.nodes, b.edges, 300);

  assertNoLeafMinors(b.nodes);
  assertNoTriangles(b.nodes);
  assertNoEdgeCrossings(b.nodes, b.edges);
  assertMinDistance(b.nodes);

  _cachedTree = b.build();
  return _cachedTree;
}

export function getClassStartNode(classId: string): number {
  return CLASS_IDS.indexOf(classId);
}
