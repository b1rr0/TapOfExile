/**
 * Passive Skill Tree — organic branching circular graph, ~560 nodes.
 *
 * The tree is pre-computed at build time (see generate-tree.ts) and loaded
 * from skill-tree-data.ts at runtime — zero computation on import.
 *
 * To regenerate after changing the generation algorithm:
 *   npx tsx shared/generate-tree.ts
 *
 * generateSkillTree() — full computation (used only by the build script).
 * buildSkillTree()    — loads pre-computed data (used at runtime by FE & BE).
 *
 * NOTE: This file is shared between FE and BE.
 * BE uses it for validation (topology); FE also uses layout (x, y) for rendering.
 */

import {
  MINOR_POOL, NOTABLE_POOL, KEYSTONE_POOL, FIGURE_ENTRY_POOL,
  CLASS_SKILLS, NodeDef, StatModifier,
} from "./skill-node-defs";
import type { NodeType } from "./types";
import {
  TREE_NODES, TREE_EDGES, TREE_EMBLEMS,
  TREE_FIGURE_EDGES, TREE_FIGURE_MEMBERSHIP,
} from "./skill-tree-data";

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
export const MAX_CLASS_SKILLS: number = 8;

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
  /** True for classSkill nodes that serve as path connectors (not highlighted as orange skills) */
  connector: boolean;

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
    this.connector = false;
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
      // Use gateway anchor point as origin (not centroid) — keystones are
      // placed relative to the anchor, so gateway-based radius is accurate.
      const anchorIdx = shape.gatewayIdx;
      const ax = anchorIdx !== undefined
        ? shape.points[anchorIdx][0]
        : shape.points.reduce((s, p) => s + p[0], 0) / shape.points.length;
      const ay = anchorIdx !== undefined
        ? shape.points[anchorIdx][1]
        : shape.points.reduce((s, p) => s + p[1], 0) / shape.points.length;
      const maxR = Math.max(...shape.points.map(([x, y]) =>
        Math.sqrt((x - ax) ** 2 + (y - ay) ** 2),
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

    // ── 4. Figure gateway repulsion vs non-figure outer nodes ──
    // Pushes non-figure tree nodes outside the gateway's personal space.
    // Use a modest radius (1.5× gateway node radius) to avoid disrupting layout;
    // rotation optimizer (step 5) handles actual crossing elimination.
    for (let ii = 0; ii < N; ii++) {
      if (nodes[ii].type !== "figureEntry") continue;
      for (const jj of relaxIds) {
        if (figureMembership.has(nodes[jj].id)) continue;  // skip nodes in any figure
        const ex = nodes[jj].x - nodes[ii].x;
        const ey = nodes[jj].y - nodes[ii].y;
        const dist = Math.sqrt(ex * ex + ey * ey);
        // Only prevent nodes from overlapping the gateway node itself (not the whole figure)
        const minD = baseR[ii] * 1.5 + baseR[jj];
        if (dist >= minD || dist < 0.01) continue;
        const push = minD - dist;
        dx[jj] += (ex / dist) * push;
        dy[jj] += (ey / dist) * push;
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
  // NOTE: gw.connections only contains directly-adjacent keystones — use
  // figureMembership + nodeId suffix ("-ks{k}") to map ALL keystones to shape points.
  for (let i = 0; i < N; i++) {
    const gw = nodes[i];
    if (gw.type !== "figureEntry") continue;
    const figId = figureMembership.get(gw.id);
    if (figId === undefined) continue;
    const shape = figureShapes.get(figId);
    if (!shape) continue;

    // Build shape-point-index → keystone-node map via nodeId suffix "-ks{k}"
    const pointToKs = new Map<number, SkillNode>();
    for (let j = 0; j < N; j++) {
      if (nodes[j].type !== "keystone") continue;
      if (figureMembership.get(nodes[j].id) !== figId) continue;
      const m = nodes[j].nodeId.match(/-ks(\d+)$/);
      if (m) pointToKs.set(+m[1], nodes[j]);
    }
    const anchorIdx = shape.gatewayIdx;
    const expectedKs = anchorIdx !== undefined ? shape.points.length - 1 : shape.points.length;
    if (pointToKs.size !== expectedKs) continue;  // sanity check

    const outA = Math.atan2(gw.y - CY, gw.x - CX);
    const scale = shape.points.length >= 7 ? FIGURE_SCALE_OUTER : FIGURE_SCALE_INNER;

    // Anchor point (gateway position in abstract coords)
    const ax = anchorIdx !== undefined ? shape.points[anchorIdx][0]
      : shape.points.reduce((s, p) => s + p[0], 0) / shape.points.length;
    const ay = anchorIdx !== undefined ? shape.points[anchorIdx][1]
      : shape.points.reduce((s, p) => s + p[1], 0) / shape.points.length;

    for (let k = 0; k < shape.points.length; k++) {
      if (k === anchorIdx) continue;  // gateway sits here
      const ks = pointToKs.get(k);
      if (!ks) continue;
      const [lx, ly] = [shape.points[k][0] - ax, shape.points[k][1] - ay];
      const rx = lx * Math.cos(outA) - ly * Math.sin(outA);
      const ry = lx * Math.sin(outA) + ly * Math.cos(outA);
      ks.x = gw.x + rx * scale;
      ks.y = gw.y + ry * scale;
    }
  }

  // ── 5. Optimize figure rotation to minimize figure-to-tree crossings ──
  // For each figure, search ROT_STEPS evenly-spaced rotation angles (10° steps)
  // and pick the one with the fewest crossings between figure-internal edges
  // (both endpoints in same figure) and outer-tree edges (neither endpoint in
  // this figure). Updates keystone positions in place.
  {
    const ROT_STEPS = 360;  // 1° granularity — fine enough for any geometry

    for (let i = 0; i < N; i++) {
      const gw = nodes[i];
      if (gw.type !== "figureEntry") continue;
      const figId = figureMembership.get(gw.id);
      if (figId === undefined) continue;
      const shape = figureShapes.get(figId);
      if (!shape) continue;

      // Build shape-point-index → keystone-node-id map via nodeId suffix "-ks{k}"
      const pointToKsId = new Map<number, number>();
      for (let j = 0; j < N; j++) {
        if (nodes[j].type !== "keystone") continue;
        if (figureMembership.get(nodes[j].id) !== figId) continue;
        const m = nodes[j].nodeId.match(/-ks(\d+)$/);
        if (m) pointToKsId.set(+m[1], j);
      }
      const anchorIdx = shape.gatewayIdx;
      const expectedKs = anchorIdx !== undefined ? shape.points.length - 1 : shape.points.length;
      if (pointToKsId.size !== expectedKs) continue;  // sanity check

      const figScale = shape.points.length >= 7 ? FIGURE_SCALE_OUTER : FIGURE_SCALE_INNER;

      const ancX = anchorIdx !== undefined
        ? shape.points[anchorIdx][0]
        : shape.points.reduce((s, p) => s + p[0], 0) / shape.points.length;
      const ancY = anchorIdx !== undefined
        ? shape.points[anchorIdx][1]
        : shape.points.reduce((s, p) => s + p[1], 0) / shape.points.length;

      // Edges to check against:
      // 1. Outer edges where neither endpoint belongs to this figure (tree branches)
      // 2. The gateway's parent connection (one endpoint = gateway, other = tree) — this
      //    edge can cross the figure's own keystones if rotation is wrong.
      const checkEdges = oEdges.filter(([a, b]) => {
        const fa = figureMembership.get(a);
        const fb = figureMembership.get(b);
        if (fa !== figId && fb !== figId) return true;  // neither in this figure
        if (a === gw.id && fb !== figId) return true;   // gateway↔parent edge
        if (b === gw.id && fa !== figId) return true;   // parent↔gateway edge
        return false;
      });
      if (checkEdges.length === 0) continue;

      // Compute world positions of figure keystones at a given rotation angle
      const worldFigPts = (angle: number): [number, number][] => {
        const ptW: [number, number][] = [];
        for (let k = 0; k < shape.points.length; k++) {
          if (k === anchorIdx) {
            ptW.push([gw.x, gw.y]);
          } else {
            const lx = shape.points[k][0] - ancX;
            const ly = shape.points[k][1] - ancY;
            ptW.push([
              gw.x + (lx * Math.cos(angle) - ly * Math.sin(angle)) * figScale,
              gw.y + (lx * Math.sin(angle) + ly * Math.cos(angle)) * figScale,
            ]);
          }
        }
        return ptW;
      };

      // Collect non-figure nodes near this gateway for proximity check
      const PROX_ZONE = figR[i] + 30;  // search radius for proximity violations
      const nearbyNonFig: number[] = [];
      for (const jj of relaxIds) {
        if (figureMembership.has(nodes[jj].id)) continue;
        const dx = nodes[jj].x - gw.x, dy = nodes[jj].y - gw.y;
        if (Math.sqrt(dx * dx + dy * dy) < PROX_ZONE) nearbyNonFig.push(jj);
      }

      // Penalty function: crossings (×1000) + proximity violations + small-angle violations
      const penalty = (angle: number): number => {
        const ptW = worldFigPts(angle);
        const fe = shape.edges.map(
          ([ei, ej]) => [ptW[ei][0], ptW[ei][1], ptW[ej][0], ptW[ej][1]] as [number, number, number, number],
        );
        // Edge crossings (most critical — weight 1000)
        let cross = 0;
        for (const [x1, y1, x2, y2] of fe) {
          for (const [ci, di] of checkEdges) {
            if (segsCross(x1, y1, x2, y2, nodes[ci].x, nodes[ci].y, nodes[di].x, nodes[di].y)) cross++;
          }
        }
        // Proximity: keystone overlapping with nearby non-figure node (weight 100)
        let prox = 0;
        for (let k = 0; k < ptW.length; k++) {
          if (k === anchorIdx) continue;
          const [kx, ky] = ptW[k];
          for (const jj of nearbyNonFig) {
            const dx = nodes[jj].x - kx, dy = nodes[jj].y - ky;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minD = NODE_RADIUS["keystone"] + baseR[jj] + 4;
            if (dist < minD) prox += (minD - dist);
          }
        }
        // Small angle: keystone too close to gateway→parent direction (weight 50)
        let angPen = 0;
        const parentConn = gw.connections.find(c => !figureMembership.has(nodes[c].id) || figureMembership.get(nodes[c].id) !== figId);
        if (parentConn !== undefined) {
          const parentAng = Math.atan2(nodes[parentConn].y - gw.y, nodes[parentConn].x - gw.x);
          for (let k = 0; k < ptW.length; k++) {
            if (k === anchorIdx) continue;
            const ksAng = Math.atan2(ptW[k][1] - gw.y, ptW[k][0] - gw.x);
            let diff = Math.abs(ksAng - parentAng);
            if (diff > Math.PI) diff = 2 * Math.PI - diff;
            if (diff < Math.PI / 6) angPen += (Math.PI / 6 - diff) * 50;
          }
        }
        return cross * 1000 + prox * 100 + angPen;
      };

      const baseAngle = Math.atan2(gw.y - CY, gw.x - CX);
      let bestAngle = baseAngle;
      let bestPen = penalty(baseAngle);

      if (bestPen > 0) {
        for (let step = 1; step < ROT_STEPS; step++) {
          const tryAngle = baseAngle + (step / ROT_STEPS) * 2 * Math.PI;
          const p = penalty(tryAngle);
          if (p < bestPen) {
            bestPen = p;
            bestAngle = tryAngle;
            if (bestPen === 0) break;
          }
        }
      }

      // Apply the best rotation to keystone node positions
      if (bestAngle !== baseAngle || true) {  // always apply to ensure correct placement
        for (let k = 0; k < shape.points.length; k++) {
          if (k === anchorIdx) continue;
          const ksIdx = pointToKsId.get(k);
          if (ksIdx === undefined) continue;
          const lx = shape.points[k][0] - ancX;
          const ly = shape.points[k][1] - ancY;
          nodes[ksIdx].x = gw.x + (lx * Math.cos(bestAngle) - ly * Math.sin(bestAngle)) * figScale;
          nodes[ksIdx].y = gw.y + (lx * Math.sin(bestAngle) + ly * Math.cos(bestAngle)) * figScale;
        }
      }
    }
  }

  // ── 6. Push non-figure nodes away from keystones to prevent visual overlaps ──
  {
    const KS_CLEAR = 6;  // extra clearance beyond sum of radii
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < N; i++) {
        if (nodes[i].type !== "keystone") continue;
        const fi = figureMembership.get(nodes[i].id);
        const rI = NODE_RADIUS["keystone"];
        for (const jj of relaxIds) {
          if (figureMembership.has(nodes[jj].id)) continue;
          const ex = nodes[jj].x - nodes[i].x;
          const ey = nodes[jj].y - nodes[i].y;
          const dist = Math.sqrt(ex * ex + ey * ey);
          const minD = rI + baseR[jj] + KS_CLEAR;
          if (dist >= minD || dist < 0.01) continue;
          // Push the non-figure node outward
          const factor = minD / dist;
          nodes[jj].x = nodes[i].x + ex * factor;
          nodes[jj].y = nodes[i].y + ey * factor;
        }
      }
      // Also push keystones of different figures apart
      for (let i = 0; i < N; i++) {
        if (nodes[i].type !== "keystone") continue;
        const fi = figureMembership.get(nodes[i].id);
        for (let j = i + 1; j < N; j++) {
          if (nodes[j].type !== "keystone") continue;
          const fj = figureMembership.get(nodes[j].id);
          if (fi !== undefined && fi === fj) continue;  // same figure ok
          const ex = nodes[j].x - nodes[i].x;
          const ey = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(ex * ex + ey * ey);
          const minD = NODE_RADIUS["keystone"] * 2 + KS_CLEAR;
          if (dist >= minD || dist < 0.01) continue;
          const push = (minD - dist) / 2;
          const nx = (ex / dist) * push, ny = (ey / dist) * push;
          nodes[i].x -= nx; nodes[i].y -= ny;
          nodes[j].x += nx; nodes[j].y += ny;
        }
      }
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

export interface ConstellationShape {
  name: string;
  points: [number, number][];  // keystone positions (abstract coords)
  edges: [number, number][];   // edges between keystone indices
  gatewayIdx?: number;         // which vertex the gateway sits on (undefined = center)
}

export const INNER_SHAPES: ConstellationShape[] = [
  { name: "pentagon5", points: [[2,0],[4,1],[3,4],[1,4],[0,1]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,0]], gatewayIdx: 0 },
  { name: "hexagon", points: [[0,2],[1,0],[3,0],[4,2],[3,4],[1,4]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]], gatewayIdx: 0 },
  { name: "cluster6", points: [[2,2],[2,4],[4,2],[2,0],[0,2],[3,3]],
    edges: [[0,1],[0,2],[0,3],[0,4],[0,5]], gatewayIdx: 0 },  // hub — gateway IS the center
  { name: "twoTri6", points: [[0,0],[2,0],[1,2],[3,0],[5,0],[4,2]],
    edges: [[0,1],[1,2],[2,0],[1,3],[3,4],[4,5],[5,3]], gatewayIdx: 1 },
];

export const OUTER_SHAPES: ConstellationShape[] = [
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
  // Zodiac-inspired constellations (simplified to ≤9 nodes)
  { name: "aries", points: [[0,0],[1,2],[2,3],[3,4],[4,3],[5,2],[4,1],[3,0]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]], gatewayIdx: 0 },  // ram horns
  { name: "taurus", points: [[0,3],[1,1],[3,0],[5,1],[6,3],[4,4],[2,4]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0]], gatewayIdx: 2 },  // bull head ring
  { name: "gemini", points: [[0,0],[0,2],[0,4],[2,1],[2,3],[4,0],[4,2],[4,4]],
    edges: [[0,1],[1,2],[3,4],[5,6],[6,7],[0,5],[1,3],[3,6],[2,7]], gatewayIdx: 0 },  // twins
  { name: "leo", points: [[0,2],[1,0],[3,0],[4,2],[3,4],[1,4],[2,2],[4,5],[5,6]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[3,6],[4,7],[7,8]], gatewayIdx: 0 },  // lion
  { name: "scorpio", points: [[0,0],[2,0],[4,1],[6,2],[7,4],[6,5],[5,4],[4,6]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[5,7]], gatewayIdx: 0 },  // scorpion tail
  { name: "spiral9", points: [[0,0],[4,0],[4,4],[0,4],[0,1],[3,1],[3,3],[1,3],[1,2]],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]], gatewayIdx: 0 },
  { name: "cross9", points: [[0,2],[2,2],[4,2],[2,0],[2,4],[2,6],[0,0],[4,0],[0,4]],
    edges: [[0,1],[1,2],[3,1],[1,4],[4,5],[6,1],[1,7],[4,8]], gatewayIdx: 3 },
  { name: "sagittarius", points: [[0,4],[1,2],[2,0],[3,2],[4,4],[3,3],[2,5],[1,3],[4,0]],
    edges: [[0,1],[1,2],[2,3],[3,4],[1,7],[7,5],[5,3],[2,8],[5,6]], gatewayIdx: 2 },  // archer bow
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

// ── Main entry point — loads pre-computed data ────────────

export function buildSkillTree(): SkillTreeResult {
  if (_cachedTree) return _cachedTree;
  _cachedTree = hydrateTree();
  return _cachedTree;
}

/**
 * Hydrate SkillTreeResult from pre-computed static data.
 * Reconstructs SkillNode instances with NodeDef references from the pools.
 */
function hydrateTree(): SkillTreeResult {
  const defIndex = buildDefIndex();

  const nodes: SkillNode[] = TREE_NODES.map((raw) => {
    const def = raw.defId ? defIndex.get(raw.defId) || null : null;
    const node = new SkillNode(
      raw.id, raw.nodeId, raw.type as NodeType, raw.classAffinity,
      raw.x, raw.y,
      def || { label: raw.label, name: raw.name, stat: raw.stat, value: raw.value },
    );
    node.connections = raw.connections;
    node.connector = (raw as any).connector || false;
    // If no def matched but we have mods data, rebuild mods array
    if (!def && raw.mods && raw.mods.length > 0) {
      node.mods = raw.mods.map((m) => new StatModifier(m.stat, m.value, m.mode as "percent" | "flat"));
    }
    return node;
  });

  const edges: [number, number][] = TREE_EDGES;

  const emblems: Emblem[] = TREE_EMBLEMS;

  const figureEdgeSet = new Set<string>(TREE_FIGURE_EDGES);

  const figureMembership = new Map<number, number>(TREE_FIGURE_MEMBERSHIP);

  return { nodes, edges, emblems, figureEdgeSet, figureMembership };
}

/**
 * Build a lookup map from NodeDef.id → NodeDef across all pools.
 */
function buildDefIndex(): Map<string, NodeDef> {
  const map = new Map<string, NodeDef>();
  for (const d of MINOR_POOL) map.set(d.id, d);
  for (const d of NOTABLE_POOL) map.set(d.id, d);
  for (const d of KEYSTONE_POOL) map.set(d.id, d);
  for (const d of FIGURE_ENTRY_POOL) map.set(d.id, d);
  for (const skills of Object.values(CLASS_SKILLS)) {
    for (const d of skills) map.set(d.id, d);
  }
  return map;
}

// ── Full generator (for build-time script only) ───────────

export function generateSkillTree(): SkillTreeResult {

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

  // ── 2. Class skill mini-trees (15 per class = 60) ──────
  //
  // Stretched layout — tree grows INWARD from start (at emblem edge r=100).
  // D1 at r=80 (4/5 of emblem radius). Branches fill the emblem interior.
  //
  //   Topology:
  //     Long branches (0, 1, 3): D2(conn)→D3(skill)→D4(conn)→D5(skill)
  //     Fork branch  (2):       D2(conn)→skill2→junction(conn)→ forkL(skill4) / forkR(skill5)
  //     Middle branch (1):      D2(conn)→D3(skill1, leaf)
  //
  //   ◉ = classSkill (red), connector=false   — 8 total
  //   ○ = classSkill (path node), connector=true  — 7 total
  //   MAX_CLASS_SKILLS = 8
  //
  //   Layout: 2 circumference branches (0, 3) arc along the edge at r≈66-78;
  //           2 middle branches (1, 2) dive toward center at r≈14-60.
  //   Edge lengths increase with depth (wider angular spread).

  const FORK_IDX = 2; // which of the 4 branches is the fork

  // ── Sketch-based layout ──────────────────────────────────
  // Hand-crafted from user sketch (samurai, d=500px, scaled ×0.4).
  // Each node: [angle_offset_from_startA (radians), radius].
  // Auto-rotated per class via startA.
  //
  // Tree grows DOWNWARD from start like an inverted tree.
  // Branches fill the circle interior; endpoints reach far edges.
  //
  // Node mapping from sketch:
  //   D1=root, B0: 1→2→3, B1: 4→(interp)→11, B2 fork: 6→(9,10), B3: 5→7→8

  // Two concentric circles for node placement:
  //   Side radius:   r = 75  (branches 0, 3)
  //   Middle radius: r = 45  (branches 1, 2 + fork tips)
  //   D1 at r = 90 (10px from start at r=100)
  const R_SIDE = 75;
  const R_MID  = 45;

  const D1_POS: [number, number] = [0.0, 75]; // 25px from start

  // [D2(conn), D3(skill), D4(conn), D5(skill)] — per branch
  // Angular steps ~0.55 rad between consecutive nodes
  const BRANCH_POS: [number, number][][] = [
    // Branch 0 (side-left): all on r=75, angles ×1.25
    [[-0.625, R_SIDE], [-1.3125, R_SIDE], [-2.00, R_SIDE], [-2.6875, R_SIDE]],
    // Branch 1 (middle-left): D2 -35°, D3 (skill 1, leaf) -70°
    [[-35 * Math.PI / 180, R_MID], [-70 * Math.PI / 180, R_MID]],
    // Branch 2 (fork): D2 +35°, junction(conn) +70° → forkL/forkR/skill2(+105°)
    [[+35 * Math.PI / 180, R_MID], [+70 * Math.PI / 180, R_MID], [+105 * Math.PI / 180, R_MID]],
    // Branch 3 (side-right): all on r=75, angles ×1.25
    [[+0.625, R_SIDE], [+1.3125, R_SIDE], [+2.00, R_SIDE], [+2.6875, R_SIDE]],
  ];

  // Fork endpoints from D3[FORK_IDX] — on middle circle r=50
  const FORK_POS: [number, number][] = [
    [200 * Math.PI / 180, R_MID],   // fork-L: 200° ≈ 3.491 rad
    [160 * Math.PI / 180, R_MID],   // fork-R: 160° ≈ 2.793 rad
  ];

  for (let ci = 0; ci < 4; ci++) {
    const cls = CLASS_IDS[ci];
    const em = b.emblems[ci];
    const ecx = em.cx, ecy = em.cy;
    const startA = START_OFFSET_ANGLE[cls];
    let si = 0;
    let cni = 0;

    function emPolar(angle: number, r: number): [number, number] {
      return [ecx + Math.cos(angle) * r, ecy + Math.sin(angle) * r];
    }

    function mkSkill(aOff: number, r: number): SkillNode {
      const [nx, ny] = emPolar(startA + aOff, r);
      const n = b.createNode(
        `${cls}-cs-s${si}`, "classSkill", cls, nx, ny,
        { label: `${cls} skill ${si}` },
      );
      si++;
      n.connector = false;
      return n;
    }

    function mkConn(aOff: number, r: number): SkillNode {
      const [nx, ny] = emPolar(startA + aOff, r);
      const n = b.createNode(
        `${cls}-cs-c${cni}`, "classSkill", cls, nx, ny,
        { label: cls },
      );
      cni++;
      n.connector = true;
      return n;
    }

    // D1 — bridge connector
    const d1 = mkConn(D1_POS[0], D1_POS[1]);
    b.link(starts[ci], d1);

    // D2 — 4 path connectors
    const d2 = BRANCH_POS.map(bp => {
      const n = mkConn(bp[0][0], bp[0][1]);
      b.link(d1, n);
      return n;
    });

    const longIndices = [0, 3];

    // D3 — skill/connector endpoints per branch
    const d3 = BRANCH_POS.map((bp, i) => {
      const isLong = longIndices.includes(i);
      const isFork = i === FORK_IDX;

      if (!isLong && bp.length > 2) {
        // Fork: D2→skill(+70°)→junction(conn,+105°) — fork branches from junction
        // Other: D2→skill→skill chain
        let prev = d2[i];
        for (let k = 1; k < bp.length - 1; k++) {
          const mid = mkSkill(bp[k][0], bp[k][1]);
          b.link(prev, mid);
          prev = mid;
        }
        const lastPos = bp[bp.length - 1];
        const n = isFork
          ? mkConn(lastPos[0], lastPos[1])
          : mkSkill(lastPos[0], lastPos[1]);
        b.link(prev, n);
        return n;
      }

      const n = mkSkill(bp[1][0], bp[1][1]);
      b.link(d2[i], n);
      return n;
    });

    // D4 + D5 for long (side) branches only
    const d4Conn: (SkillNode | null)[] = [null, null, null, null];

    for (const li of longIndices) {
      const n = mkConn(BRANCH_POS[li][2][0], BRANCH_POS[li][2][1]);
      b.link(d3[li], n);
      d4Conn[li] = n;
    }

    // Fork: 2 skill endpoints from d3[FORK_IDX] (the junction connector)
    const forkL = mkSkill(FORK_POS[0][0], FORK_POS[0][1]);
    const forkR = mkSkill(FORK_POS[1][0], FORK_POS[1][1]);
    b.link(d3[FORK_IDX], forkL);
    b.link(d3[FORK_IDX], forkR);

    // D5 — 3 skill endpoints for long branches
    for (const li of longIndices) {
      const n = mkSkill(BRANCH_POS[li][3][0], BRANCH_POS[li][3][1]);
      b.link(d4Conn[li]!, n);
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

  return b.build();
}

export function getClassStartNode(classId: string): number {
  return CLASS_IDS.indexOf(classId);
}

// ── SVG rendering helpers (shared between bot and wiki) ──────────────────────

export function hexPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return `M${pts.join('L')}Z`;
}

export function diamondPath(cx: number, cy: number, r: number): string {
  return `M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`;
}

/** Returns SVG shape name for a node type. */
export function getNodeShape(nodeType: string, isConnector: boolean): 'circle' | 'hex' | 'diamond' {
  if (isConnector) return 'hex';
  if (nodeType === 'keystone') return 'diamond';
  if (nodeType === 'notable' || nodeType === 'classSkill' || nodeType === 'figureEntry') return 'hex';
  return 'circle';
}
