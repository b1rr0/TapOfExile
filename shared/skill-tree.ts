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
  MINOR_POOL, NOTABLE_POOL, KEYSTONE_POOL, FIGURE_ENTRY_POOL,
  CLASS_SKILLS, NodeDef, StatModifier,
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
  figureEdgeSet: Set<string>;
  figureMembership: Map<number, number>;
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
  keystone: 14, notable: 11, start: 7, classSkill: 8, minor: 7, figureEntry: 9,
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
  _figureEntryIdx: number;
  _rng: () => number;
  _figRng: () => number;  // separate RNG for figure generation (doesn't shift main tree)
  _figureEdgeSet: Set<string>;
  _figureMembership: Map<number, number>;
  _figureShapes: Map<number, ConstellationShape>;
  _nextFigureId: number;

  constructor() {
    this.nodes = [];
    this.edges = [];
    this.emblems = [];
    this._nextId = 0;
    this._minorIdx = 0;
    this._notableIdx = 0;
    this._keystoneIdx = 0;
    this._figureEntryIdx = 0;
    this._rng = seededRng(42);
    this._figRng = seededRng(12345);  // independent seed for figures
    this._figureEdgeSet = new Set();
    this._figureMembership = new Map();
    this._figureShapes = new Map();
    this._nextFigureId = 0;
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

  nextMinor(): NodeDef       { return MINOR_POOL[this._minorIdx++ % MINOR_POOL.length]; }
  nextNotable(): NodeDef     { return NOTABLE_POOL[this._notableIdx++ % NOTABLE_POOL.length]; }
  nextKeystone(): NodeDef    { return KEYSTONE_POOL[this._keystoneIdx++ % KEYSTONE_POOL.length]; }
  nextFigureEntry(): NodeDef { return FIGURE_ENTRY_POOL[this._figureEntryIdx++ % FIGURE_ENTRY_POOL.length]; }

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

  // ── Figure tracking ──────────────────────────────

  setFigureId(nodeId: number, figureId: number): void {
    this._figureMembership.set(nodeId, figureId);
  }

  addFigureEdge(aId: number, bId: number): void {
    const key = `${Math.min(aId, bId)}-${Math.max(aId, bId)}`;
    this._figureEdgeSet.add(key);
  }

  isFigureEdge(aId: number, bId: number): boolean {
    return this._figureEdgeSet.has(`${Math.min(aId, bId)}-${Math.max(aId, bId)}`);
  }

  sameFigure(aId: number, bId: number): boolean {
    const fa = this._figureMembership.get(aId);
    const fb = this._figureMembership.get(bId);
    return fa !== undefined && fb !== undefined && fa === fb;
  }

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
    return {
      nodes: this.nodes, edges: this.edges, emblems: this.emblems,
      figureEdgeSet: this._figureEdgeSet,
      figureMembership: this._figureMembership,
    };
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
 * Compute effective repulsion radius for a node.
 * FigureEntry gateways use constellation bounding radius; others use NODE_RADIUS.
 */
function effectiveRadius(
  node: SkillNode,
  figureMembership: Map<number, number>,
  figureShapes: Map<number, ConstellationShape>,
): number {
  if (node.type === "figureEntry") {
    const figId = figureMembership.get(node.id);
    const shape = figId !== undefined ? figureShapes.get(figId) : undefined;
    if (shape) {
      const cx = shape.points.reduce((s, p) => s + p[0], 0) / shape.points.length;
      const cy = shape.points.reduce((s, p) => s + p[1], 0) / shape.points.length;
      const maxR = Math.max(...shape.points.map(([x, y]) =>
        Math.sqrt((x - cx) ** 2 + (y - cy) ** 2),
      ));
      const scale = shape.points.length >= 7 ? FIGURE_SCALE_OUTER : FIGURE_SCALE_INNER;
      return maxR * scale + NODE_RADIUS["keystone"];
    }
  }
  return NODE_RADIUS[node.type] || 8;
}

/**
 * Iteratively adjusts outer-node positions to satisfy:
 *  1. Min distance between outer nodes (4× diameter)
 *  2. No outer-edge crossings
 * classSkill and start nodes are anchored; their edges are excluded from checks.
 * Keystone nodes are NOT independently movable — they follow their gateway shape.
 */
function relaxLayout(
  nodes: SkillNode[], edges: [number, number][], emblems: Emblem[], maxIter: number,
  figureEdgeSet: Set<string>, figureMembership: Map<number, number>,
  figureShapes: Map<number, ConstellationShape>,
): void {
  const N = nodes.length;
  const movable = nodes.map(n => isOuter(n));
  const oEdges = outerEdges(nodes, edges);

  // Figure keystones and figureEntry gateways are NOT independently movable.
  // Keystones follow their gateway shape; gateways are placed precisely.
  const movableRelax = nodes.map((n, i) =>
    movable[i] && n.type !== "keystone" && n.type !== "figureEntry",
  );

  // Non-keystone outer ids for relaxation
  const relaxIds: number[] = [];
  for (let i = 0; i < N; i++) if (movableRelax[i]) relaxIds.push(i);

  // Pre-compute effective radii for repulsion
  // figureEntry uses constellation bounding radius for figureEntry-to-figureEntry pairs only
  const baseR = new Float64Array(N);
  const figR = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    baseR[i] = nodeR(nodes[i].type);
    figR[i] = effectiveRadius(nodes[i], figureMembership, figureShapes);
  }

  for (let iter = 0; iter < maxIter; iter++) {
    let anyChange = false;
    const dx = new Array<number>(N).fill(0);
    const dy = new Array<number>(N).fill(0);

    // ── 1. Min-distance repulsion (outer non-keystone nodes only) ──
    for (let ii = 0; ii < relaxIds.length; ii++) {
      const i = relaxIds[ii];
      for (let jj = ii + 1; jj < relaxIds.length; jj++) {
        const j = relaxIds[jj];
        const a = nodes[i], b = nodes[j];
        // Use constellation radius only for figureEntry-to-figureEntry pairs
        const bothFig = a.type === "figureEntry" && b.type === "figureEntry";
        const rA = bothFig ? figR[i] : baseR[i];
        const rB = bothFig ? figR[j] : baseR[j];
        const minD = MIN_DIST_MULT * Math.max(rA, rB);
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

    // ── 2. Edge-crossing resolution (skip keystone & intra-figure edges) ──
    for (let i = 0; i < oEdges.length; i++) {
      const [ai, bi] = oEdges[i];
      if (nodes[ai].type === "keystone" || nodes[bi].type === "keystone") continue;
      if (figureEdgeSet.has(`${Math.min(ai, bi)}-${Math.max(ai, bi)}`)) continue;
      for (let j = i + 1; j < oEdges.length; j++) {
        const [ci, di] = oEdges[j];
        if (nodes[ci].type === "keystone" || nodes[di].type === "keystone") continue;
        if (figureEdgeSet.has(`${Math.min(ci, di)}-${Math.max(ci, di)}`)) continue;
        if (ai === ci || ai === di || bi === ci || bi === di) continue;
        const na = nodes[ai], nb = nodes[bi], nc = nodes[ci], nd = nodes[di];
        if (!segsCross(na.x, na.y, nb.x, nb.y, nc.x, nc.y, nd.x, nd.y)) continue;
        const all = [ai, bi, ci, di];
        for (const t of all) {
          if (!movableRelax[t]) continue;
          const partner = t === ai ? bi : t === bi ? ai : t === ci ? di : ci;
          const edx = nodes[partner].x - nodes[t].x;
          const edy = nodes[partner].y - nodes[t].y;
          const len = Math.sqrt(edx * edx + edy * edy) || 1;
          const sign = ((iter + t) % 2 === 0) ? 1 : -1;
          const force = 20;
          dx[t] += (-edy / len) * force * sign;
          dy[t] += (edx / len) * force * sign;
        }
        anyChange = true;
      }
    }

    // ── 3. Emblem repulsion (push outer non-keystone nodes away from emblem edges) ──
    const EMBLEM_CLEARANCE = 20;
    for (const oi of relaxIds) {
      const n = nodes[oi];
      const nr = baseR[oi];
      for (const em of emblems) {
        const ex = n.x - em.cx, ey = n.y - em.cy;
        const dist = Math.sqrt(ex * ex + ey * ey);
        const minD = em.r + nr + EMBLEM_CLEARANCE;
        if (dist >= minD || dist < 0.01) continue;
        const push = minD - dist;
        dx[oi] += (ex / dist) * push;
        dy[oi] += (ey / dist) * push;
        anyChange = true;
      }
    }

    if (!anyChange) break;

    // Apply with damping + max displacement clamp for stability
    const damp = 0.5 * (1 - iter / (maxIter * 2));
    const maxDisp = 20;
    for (let i = 0; i < N; i++) {
      if (!movableRelax[i]) continue;
      let ddx = dx[i] * damp, ddy = dy[i] * damp;
      const mag = Math.sqrt(ddx * ddx + ddy * ddy);
      if (mag > maxDisp) { ddx *= maxDisp / mag; ddy *= maxDisp / mag; }
      nodes[i].x += ddx;
      nodes[i].y += ddy;
    }
  }

  // ── 4. Position figure keystones using constellation shapes ──
  // After main relaxation, place keystones per their shape geometry,
  // anchored on gateway (which may sit at a vertex or at the center).
  for (let i = 0; i < N; i++) {
    const gw = nodes[i];
    if (gw.type !== "figureEntry") continue;
    const figId = figureMembership.get(gw.id);
    if (figId === undefined) continue;
    const shape = figureShapes.get(figId);
    if (!shape) continue;

    const ksIds = gw.connections.filter(c => nodes[c].type === "keystone");
    const anchorIdx = shape.gatewayIdx;
    const expectedKs = anchorIdx !== undefined ? shape.points.length - 1 : shape.points.length;
    if (ksIds.length === 0 || ksIds.length !== expectedKs) continue;

    const outA = Math.atan2(gw.y - CY, gw.x - CX);
    const scale = shape.points.length >= 7 ? FIGURE_SCALE_OUTER : FIGURE_SCALE_INNER;

    // Anchor point (gateway position in abstract coords)
    const ax = anchorIdx !== undefined ? shape.points[anchorIdx][0]
      : shape.points.reduce((s, p) => s + p[0], 0) / shape.points.length;
    const ay = anchorIdx !== undefined ? shape.points[anchorIdx][1]
      : shape.points.reduce((s, p) => s + p[1], 0) / shape.points.length;

    let ksK = 0;
    for (let k = 0; k < shape.points.length; k++) {
      if (k === anchorIdx) continue;  // gateway sits here
      const [lx, ly] = [shape.points[k][0] - ax, shape.points[k][1] - ay];
      const rx = lx * Math.cos(outA) - ly * Math.sin(outA);
      const ry = lx * Math.sin(outA) + ly * Math.cos(outA);
      nodes[ksIds[ksK]].x = gw.x + rx * scale;
      nodes[ksIds[ksK]].y = gw.y + ry * scale;
      ksK++;
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

function assertNoTriangles(nodes: SkillNode[], figureMembership: Map<number, number>): void {
  for (const a of nodes) {
    const conns = a.connections;
    for (let i = 0; i < conns.length; i++) {
      for (let j = i + 1; j < conns.length; j++) {
        if (nodes[conns[i]].connections.includes(conns[j])) {
          // Skip triangles where all 3 nodes are in the same figure
          const fa = figureMembership.get(a.id);
          const fb = figureMembership.get(conns[i]);
          const fc = figureMembership.get(conns[j]);
          if (fa !== undefined && fa === fb && fa === fc) continue;
          throw new Error(`Triangle: ${a.id}-${conns[i]}-${conns[j]}`);
        }
      }
    }
  }
}

/**
 * Only checks outer-tree edges.
 * Skips crossings where at least one edge is fully within a figure
 * (both endpoints in the same figure), since figure-internal layout is shape-driven.
 */
function assertNoEdgeCrossings(
  nodes: SkillNode[], edges: [number, number][],
  figureEdgeSet: Set<string>, figureMembership: Map<number, number>,
): void {
  const oEdges = outerEdges(nodes, edges);
  for (let i = 0; i < oEdges.length; i++) {
    const [ai, bi] = oEdges[i];
    // Skip if edge i is fully within a figure
    const fa = figureMembership.get(ai), fb = figureMembership.get(bi);
    if (fa !== undefined && fa === fb) continue;
    for (let j = i + 1; j < oEdges.length; j++) {
      const [ci, di] = oEdges[j];
      if (ai === ci || ai === di || bi === ci || bi === di) continue;
      // Skip if edge j is fully within a figure
      const fc = figureMembership.get(ci), fd = figureMembership.get(di);
      if (fc !== undefined && fc === fd) continue;
      if (segsCross(nodes[ai].x, nodes[ai].y, nodes[bi].x, nodes[bi].y,
                     nodes[ci].x, nodes[ci].y, nodes[di].x, nodes[di].y)) {
        throw new Error(`Edge crossing: ${nodes[ai].nodeId}↔${nodes[bi].nodeId} x ${nodes[ci].nodeId}↔${nodes[di].nodeId}`);
      }
    }
  }
}

function assertNoFourCycles(nodes: SkillNode[], figureMembership: Map<number, number>): void {
  for (let a = 0; a < nodes.length; a++) {
    for (const bId of nodes[a].connections) {
      if (bId <= a) continue;
      for (const cId of nodes[bId].connections) {
        if (cId === a) continue;
        for (const dId of nodes[cId].connections) {
          if (dId === bId || dId === a || dId <= a) continue;
          if (nodes[dId].connections.includes(a)) {
            // Skip 4-cycles where all 4 nodes are in the same figure
            const fa = figureMembership.get(a);
            const fb = figureMembership.get(bId);
            const fc = figureMembership.get(cId);
            const fd = figureMembership.get(dId);
            if (fa !== undefined && fa === fb && fa === fc && fa === fd) continue;
            throw new Error(`4-cycle: ${nodes[a].nodeId}-${nodes[bId].nodeId}-${nodes[cId].nodeId}-${nodes[dId].nodeId}`);
          }
        }
      }
    }
  }
}

/** Only checks outer-tree node pairs. Keystones and same-figure pairs are skipped entirely. */
function assertMinDistance(nodes: SkillNode[], figureMembership: Map<number, number>): void {
  const outer = nodes.filter(n => isOuter(n));
  for (let i = 0; i < outer.length; i++) {
    for (let j = i + 1; j < outer.length; j++) {
      const a = outer[i], b = outer[j];

      // Skip keystones entirely (positions are shape-determined, not adjustable)
      if (a.type === "keystone" || b.type === "keystone") continue;

      // Connected nodes skip distance check
      if (a.connections.includes(b.id)) continue;

      // Same-figure nodes: skip entirely (positions are shape-determined)
      const fa = figureMembership.get(a.id), fb = figureMembership.get(b.id);
      if (fa !== undefined && fb !== undefined && fa === fb) continue;

      // FigureEntry-to-figureEntry: use effective constellation radius
      // FigureEntry-to-non-figure: use reduced mult
      let mult = MIN_DIST_MULT;
      if (fa !== undefined || fb !== undefined) mult = 2;

      const minD = mult * Math.max(nodeR(a.type), nodeR(b.type));
      const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
      if (dist < minD - 0.5) {
        throw new Error(`Too close: ${a.nodeId} & ${b.nodeId} (${dist.toFixed(1)} < ${minD})`);
      }
    }
  }
}

function assertMinorToNotableDist(nodes: SkillNode[], maxHops: number): void {
  for (const n of nodes) {
    if (n.type !== "minor") continue;
    const vis = new Set<number>([n.id]);
    const q: [number, number][] = [[n.id, 0]];
    let found = false;
    while (q.length) {
      const [cur, d] = q.shift()!;
      if (nodes[cur].type === "notable" && d > 0) {
        if (d > maxHops) {
          throw new Error(`Minor ${n.nodeId} is ${d} hops from nearest notable ${nodes[cur].nodeId} (max ${maxHops})`);
        }
        found = true;
        break;
      }
      for (const nb of nodes[cur].connections) {
        if (!vis.has(nb)) { vis.add(nb); q.push([nb, d + 1]); }
      }
    }
    if (!found) throw new Error(`Minor ${n.nodeId} cannot reach any notable`);
  }
}

/** Every keystone must be in a figure. Outer leaves must be keystones. */
function assertKeystonesOnlyInFigures(nodes: SkillNode[], figureMembership: Map<number, number>): void {
  for (const n of nodes) {
    if (n.type === "keystone" && !figureMembership.has(n.id)) {
      throw new Error(`Keystone ${n.nodeId} not in any figure`);
    }
    // Outer degree-1 leaves must be keystones (figureEntry always has ≥2 connections)
    if (isOuter(n) && n.connections.length === 1 && n.type !== "keystone") {
      throw new Error(`Outer leaf ${n.nodeId} (type=${n.type}) must be keystone`);
    }
  }
}

/** Every notable must reach a figureEntry within maxHops hops. */
function assertNotableToFigureEntryDist(nodes: SkillNode[], maxHops: number): void {
  for (const n of nodes) {
    if (n.type !== "notable") continue;
    const vis = new Set<number>([n.id]);
    const q: [number, number][] = [[n.id, 0]];
    let found = false;
    while (q.length) {
      const [cur, d] = q.shift()!;
      if (nodes[cur].type === "figureEntry" && d > 0) {
        if (d > maxHops) {
          throw new Error(`Notable ${n.nodeId} is ${d} hops from nearest figureEntry ${nodes[cur].nodeId} (max ${maxHops})`);
        }
        found = true;
        break;
      }
      for (const nb of nodes[cur].connections) {
        if (!vis.has(nb)) { vis.add(nb); q.push([nb, d + 1]); }
      }
    }
    if (!found) throw new Error(`Notable ${n.nodeId} cannot reach any figureEntry`);
  }
}

/** Every keystone must be connected to exactly one figureEntry. */
function assertKeystonesInFigures(nodes: SkillNode[]): void {
  for (const n of nodes) {
    if (n.type !== "keystone") continue;
    // Keystone must be reachable from a figureEntry within the figure
    // (directly connected or via other keystones in the same figure)
    const feNeighbors = n.connections.filter(cId => nodes[cId].type === "figureEntry");
    if (feNeighbors.length > 1) {
      throw new Error(`Keystone ${n.nodeId} has ${feNeighbors.length} figureEntry neighbors (max 1)`);
    }
  }
}

/** FigureEntry gateways must have ≥2 connections (1 parent + at least 1 keystone). */
function assertNoLeafFigureEntries(nodes: SkillNode[]): void {
  for (const n of nodes) {
    if (n.type !== "figureEntry") continue;
    const ksCount = n.connections.filter(c => nodes[c].type === "keystone").length;
    if (ksCount < 1) {
      throw new Error(`FigureEntry ${n.nodeId} has no keystone connections`);
    }
  }
}

function assertEmblemClearance(nodes: SkillNode[], emblems: Emblem[], minGap: number): void {
  for (const n of nodes) {
    if (!isOuter(n)) continue;
    const nr = nodeR(n.type);
    for (const em of emblems) {
      const dist = Math.sqrt((n.x - em.cx) ** 2 + (n.y - em.cy) ** 2);
      const gap = dist - em.r - nr;
      if (gap < minGap) {
        throw new Error(`Node ${n.nodeId} too close to emblem ${em.classId}: gap=${gap.toFixed(1)}px (min ${minGap})`);
      }
    }
  }
}

// ── Constellation figure system ──────────────────────────

interface ConstellationShape {
  name: string;
  points: [number, number][];  // keystone positions (abstract coords)
  edges: [number, number][];   // edges between keystone indices
  gatewayIdx?: number;         // which vertex the gateway sits on (undefined = center)
}

const INNER_SHAPES: ConstellationShape[] = [
  { name: "star5", points: [[0,3],[2,0],[4,3],[1,1.5],[3,1.5]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,0]], gatewayIdx: 0 },
  { name: "hexagon", points: [[0,2],[1,0],[3,0],[4,2],[3,4],[1,4]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]], gatewayIdx: 0 },
  { name: "cluster6", points: [[2,2],[2,4],[4,2],[2,0],[0,2],[3,3]],
    edges: [[0,1],[0,2],[0,3],[0,4],[0,5]], gatewayIdx: 0 },  // hub — gateway IS the center
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
  { name: "spiral9", points: [[0,0],[3,0],[3,3],[1,3],[1,1],[2,1],[2,2],[0,2],[0,4]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]], gatewayIdx: 0 },
  { name: "cross9", points: [[0,2],[2,2],[4,2],[2,0],[2,4],[2,6],[1,2],[3,2],[2,3]],
    edges: [[0,1],[1,2],[3,1],[1,4],[4,5],[6,1],[1,7],[4,8]], gatewayIdx: 3 },
  { name: "circle10", points: [[0,3],[2,5],[4,5],[6,3],[6,1],[4,-1],[2,-1],[0,1],[1,3],[5,3]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[0,8],[8,9],[9,3]], gatewayIdx: 7 },
  { name: "tree10", points: [[0,0],[-2,2],[2,2],[-3,4],[-1,4],[1,4],[3,4],[-3,6],[-1,6],[1,6]],
    edges: [[0,1],[0,2],[1,3],[1,4],[2,5],[2,6],[3,7],[4,8],[5,9]], gatewayIdx: 0 },
  { name: "complex10", points: [[0,0],[2,1],[4,0],[5,2],[4,4],[2,5],[0,4],[-1,2],[2,3],[3,2]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[1,9],[5,8]], gatewayIdx: 7 },
];

const FIGURE_SCALE_INNER = 16;  // px per abstract unit for inner figures (was 8)
const FIGURE_SCALE_OUTER = 18;  // px per abstract unit for outer figures (was 10)

/**
 * Grow a constellation figure at a terminal position.
 * Creates a figureEntry (gateway) node + N keystone nodes with internal edges.
 * Gateway connects to each keystone; keystones connect to each other per shape.edges.
 * Returns the gateway node.
 */
function growFigure(
  b: SkillTreeBuilder,
  parent: SkillNode,
  angle: number,
  radius: number,
  cls: string,
  tag: string,
  tier: "inner" | "outer",
): SkillNode {
  // Use separate figure RNG to avoid shifting main tree positions
  const fr = b._figRng;
  const pool = tier === "inner" ? INNER_SHAPES : OUTER_SHAPES;
  const shape = pool[Math.floor(fr() * pool.length)];
  const figId = b._nextFigureId++;
  b._figureShapes.set(figId, shape);

  const [gx, gy] = b.polar(angle, radius);
  const jit = (v: number, amt: number) => v + (fr() - 0.5) * amt;
  const gateway = b.createNode(
    `${cls}-fig-${tag}-gate`, "figureEntry", cls,
    jit(gx, 2), jit(gy, 2), b.nextFigureEntry(),
  );
  b.link(parent, gateway);
  b.setFigureId(gateway.id, figId);

  // Outward angle from tree center through gateway
  const outAngle = Math.atan2(gateway.y - CY, gateway.x - CX);
  const scale = tier === "outer" ? FIGURE_SCALE_OUTER : FIGURE_SCALE_INNER;

  // Anchor point: if gatewayIdx is set, gateway sits at that vertex;
  // otherwise gateway sits at shape center and all keystones radiate from it.
  const anchorIdx = shape.gatewayIdx;
  const ax = anchorIdx !== undefined ? shape.points[anchorIdx][0]
    : shape.points.reduce((s, p) => s + p[0], 0) / shape.points.length;
  const ay = anchorIdx !== undefined ? shape.points[anchorIdx][1]
    : shape.points.reduce((s, p) => s + p[1], 0) / shape.points.length;

  // Create keystones at transformed positions (skip anchor vertex — gateway is there)
  const ksNodes: SkillNode[] = [];
  for (let k = 0; k < shape.points.length; k++) {
    if (k === anchorIdx) continue;  // gateway occupies this vertex
    const [lx, ly] = [shape.points[k][0] - ax, shape.points[k][1] - ay];
    // Rotate by outAngle
    const rx = lx * Math.cos(outAngle) - ly * Math.sin(outAngle);
    const ry = lx * Math.sin(outAngle) + ly * Math.cos(outAngle);
    const kx = gateway.x + rx * scale;
    const ky = gateway.y + ry * scale;
    const ks = b.createNode(
      `${cls}-fig-${tag}-ks${k}`, "keystone", cls,
      jit(kx, 2), jit(ky, 2), b.nextKeystone(),
    );
    // If no anchor vertex, gateway connects to ALL keystones (hub pattern)
    if (anchorIdx === undefined) {
      b.link(gateway, ks);
      b.addFigureEdge(gateway.id, ks.id);
    }
    b.setFigureId(ks.id, figId);
    ksNodes.push(ks);
  }

  // Build mapping: shape point index → node (gateway or keystone)
  const pointToNode: SkillNode[] = [];
  let ksIdx = 0;
  for (let k = 0; k < shape.points.length; k++) {
    if (k === anchorIdx) {
      pointToNode.push(gateway);  // gateway occupies anchor vertex
    } else {
      pointToNode.push(ksNodes[ksIdx++]);
    }
  }

  // Intra-figure edges from shape topology
  for (const [i, j] of shape.edges) {
    const ni = pointToNode[i], nj = pointToNode[j];
    if (!ni.connections.includes(nj.id)) {
      b.link(ni, nj);
    }
    b.addFigureEdge(ni.id, nj.id);
  }

  return gateway;
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
      // Last stem node before a split becomes notable (ensures minor→notable ≤ 2)
      const isSplitPoint = i === stemLen - 1 && depth > 1;
      const n = isSplitPoint
        ? b.createNode(
            `${cls}-tendril-${branchTag}-d${depth}-s${i}`,
            "notable", cls, b.jit(x, 3), b.jit(y, 3), b.nextNotable(),
          )
        : b.createNode(
            `${cls}-tendril-${branchTag}-d${depth}-s${i}`,
            "minor", cls, b.jit(x, 3), b.jit(y, 3), b.nextMinor(),
          );
      b.link(prev, n);
      prev = n;
    }
    if (depth === 1) {
      r += step * 0.7;
      const figAngle = angle + (b.rng() - 0.5) * 0.04;
      growFigure(b, prev, figAngle, r, cls, `tendril-${branchTag}-d${depth}`, "outer");
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
      b.link(tier2[1][0], n); // single parent — avoids 4-cycle via cs-1↔cs-5↔cs-15↔cs-6
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
      const [x, y] = b.polar(a, R0 + 65 + (b.rng() - 0.5) * 6);
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
      const a = base + (j - 2) * 0.24;
      const [x, y] = b.polar(a, R0 + 120 + (b.rng() - 0.5) * 8);
      const isN = j === 0 || j === 2 || j === 4;
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
      const a = base + (j - 2) * 0.25;
      const [x, y] = b.polar(a, R0 + 200 + (b.rng() - 0.5) * 10);
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
      const a = base + (t - 1) * 0.50;
      const parent = branchRing[ci][[0, 2, 4][t]];
      const pr = Math.sqrt((parent.x - CX) ** 2 + (parent.y - CY) ** 2);
      growTendril(parent, a, pr, 2, 2, cls, `m${t}`);
    }

    for (let t = 0; t < 2; t++) {
      const a = base + (t === 0 ? -0.66 : 0.66);
      const parent = branchRing[ci][t === 0 ? 0 : 4];
      const pr = Math.sqrt((parent.x - CX) ** 2 + (parent.y - CY) ** 2);
      growTendril(parent, a, pr, 1, 1, cls, `s${t}`);
    }
  }

  // ── 7. (Removed — tendril tips now produce figures directly) ──

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

  // ── 9. Branch-level figures — 2 per class (8 figureEntries) ──
  //  Inner constellation figures at branch layer, connecting branch[1]/branch[3] notables.

  for (let ci = 0; ci < 4; ci++) {
    const cls = CLASS_IDS[ci];
    const base = CLASS_ANGLE[cls] - Math.PI / 2;
    for (let j = 0; j < 2; j++) {
      const a = base + (j === 0 ? -0.15 : 0.15);
      const r = R0 + 260 + (b.rng() - 0.5) * 8;
      const parent = branchRing[ci][j === 0 ? 1 : 3];
      growFigure(b, parent, a, r, cls, `bfig-${j}`, "inner");
    }
  }

  // ── 10. (Removed — tendril tips now produce figures directly) ──

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
      const [x, y] = b.polar(a, R0 + 105 + (b.rng() - 0.5) * 12);
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

    const [x, y] = b.polar(midA, R0 + 170 + (b.rng() - 0.5) * 10);
    const n = b.createNode(
      `arc-${cls}-${nextCls}`, "notable", cls,
      b.jit(x, 4), b.jit(y, 4), b.nextNotable(),
    );
    // link between trunk-tier endpoints of adjacent classes (avoids crossing side tendrils)
    b.link(trunkRing[ci][4], n);
    b.link(trunkRing[next][0], n);
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
      const [x, y] = b.polar(a, R0 + 98 + (b.rng() - 0.5) * 6);
      const n = b.createNode(
        `${cls}-iweb-${j}`, "notable", cls,
        b.jit(x, 3), b.jit(y, 3), b.nextNotable(),
      );
      b.link(innerRing[ci][j === 0 ? 0 : 2], n);
      b.link(n, trunkRing[ci][j === 0 ? 2 : 3]);
    }
  }

  // ── Post-build: layout relaxation + validation ─────────

  relaxLayout(b.nodes, b.edges, b.emblems, 3000,
    b._figureEdgeSet, b._figureMembership, b._figureShapes);

  assertNoLeafMinors(b.nodes);
  assertNoTriangles(b.nodes, b._figureMembership);
  assertNoFourCycles(b.nodes, b._figureMembership);
  assertNoEdgeCrossings(b.nodes, b.edges, b._figureEdgeSet, b._figureMembership);
  assertMinDistance(b.nodes, b._figureMembership);
  assertEmblemClearance(b.nodes, b.emblems, 10);
  assertMinorToNotableDist(b.nodes, 2);
  assertKeystonesOnlyInFigures(b.nodes, b._figureMembership);
  assertNotableToFigureEntryDist(b.nodes, 4);
  assertKeystonesInFigures(b.nodes);
  assertNoLeafFigureEntries(b.nodes);

  // ── Post-validation: scale outer positions by 1.25× from center ──
  // Class internals (start + classSkill) keep original spacing — only shift with emblem.
  const LAYOUT_SCALE = 1.25;
  // First compute emblem shifts (emblem centers move outward)
  const emblemShift: { dx: number; dy: number }[] = b.emblems.map(em => ({
    dx: (em.cx - CX) * (LAYOUT_SCALE - 1),
    dy: (em.cy - CY) * (LAYOUT_SCALE - 1),
  }));
  for (const n of b.nodes) {
    if (isOuter(n)) {
      // Outer nodes: scale from center
      n.x = CX + (n.x - CX) * LAYOUT_SCALE;
      n.y = CY + (n.y - CY) * LAYOUT_SCALE;
    } else {
      // Class-internal nodes: shift by emblem delta (preserve internal distances)
      const ci = CLASS_IDS.indexOf(n.classAffinity);
      if (ci >= 0 && ci < emblemShift.length) {
        n.x += emblemShift[ci].dx;
        n.y += emblemShift[ci].dy;
      }
    }
  }
  for (let i = 0; i < b.emblems.length; i++) {
    b.emblems[i].cx += emblemShift[i].dx;
    b.emblems[i].cy += emblemShift[i].dy;
  }

  _cachedTree = b.build();
  return _cachedTree;
}

export function getClassStartNode(classId: string): number {
  return CLASS_IDS.indexOf(classId);
}
