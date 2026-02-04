/**
 * Passive Skill Tree — organic branching circular graph, ~256 nodes.
 *
 * Layout: 4 class starting points at radius 210 at 0/90/180/270.
 * Each start node sits inside a class emblem circle (r=100) with class background image.
 * Inside each emblem — a mini-tree of 16 class-specific skills (max 6 selectable).
 * Outside — compact rings that split into fractal tendrils (long 2-edge chains
 * that fork at their tips, creating a tree-like silhouette).
 *
 * Node types:
 *   "start"      — class starting node (free, always allocated)
 *   "classSkill" — inside the emblem circle (special class ability, max 6)
 *   "minor"      — small passive stat bonus
 *   "notable"    — medium stat bonus with a name
 *   "keystone"   — powerful unique effect at fractal tips
 */

import {
  MINOR_POOL, NOTABLE_POOL, KEYSTONE_POOL, CLASS_SKILLS, NodeDef, StatModifier,
} from "./skill-node-defs.js";
import type { Emblem, SkillTreeResult } from "../types.js";

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
const CLASS_IDS: string[] = ["samurai", "warrior", "mage", "archer"];
const CLASS_ANGLE: Record<string, number> = { samurai: 0, warrior: Math.PI / 2, mage: Math.PI, archer: (3 * Math.PI) / 2 };

const START_RADIUS: number = 210;
export const EMBLEM_RADIUS: number = 100;
export const MAX_CLASS_SKILLS: number = 6;

// Class emblem background images
const CLASS_IMG: Record<string, string> = {
  samurai: "skiiltree/samurai.png",
  warrior: "skiiltree/warrior.png",
  mage:    "skiiltree/mage.png",
  archer:  "skiiltree/archer.png",
};

// ── SkillNode ─────────────────────────────────────────────

export class SkillNode {
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
  def: NodeDef | null;
  mods: StatModifier[];
  connections: number[];

  constructor(
    id: number,
    nodeId: string,
    type: string,
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
    type: string,
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

// ── Main builder ──────────────────────────────────────────

export function buildSkillTree(): SkillTreeResult {
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
    const splay = 0.28 + b.rng() * 0.08;
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
      const a = base + (t - 1) * 0.38;
      const parent = branchRing[ci][[0, 2, 4][t]];
      const pr = Math.sqrt((parent.x - CX) ** 2 + (parent.y - CY) ** 2);
      growTendril(parent, a, pr, 2, 2, cls, `m${t}`);
    }

    for (let t = 0; t < 2; t++) {
      const a = base + (t === 0 ? -0.60 : 0.60);
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

  // ── 8. Cross-class bridges ───────────────────────────

  for (let ci = 0; ci < 4; ci++) {
    const next = (ci + 1) % 4;
    b.link(trunkRing[ci][4], trunkRing[next][0]);
  }

  return b.build();
}

export function getClassStartNode(classId: string): number {
  return CLASS_IDS.indexOf(classId);
}
