"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillTreeBuilder = exports.SkillNode = exports.MAX_CLASS_SKILLS = exports.EMBLEM_RADIUS = exports.CLASS_IDS = void 0;
exports.buildSkillTree = buildSkillTree;
exports.getClassStartNode = getClassStartNode;
const skill_node_defs_1 = require("./skill-node-defs");
function seededRng(seed) {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}
const CX = 800;
const CY = 800;
exports.CLASS_IDS = ["samurai", "warrior", "mage", "archer"];
const CLASS_ANGLE = { samurai: 0, warrior: Math.PI / 2, mage: Math.PI, archer: (3 * Math.PI) / 2 };
const START_RADIUS = 210;
exports.EMBLEM_RADIUS = 100;
exports.MAX_CLASS_SKILLS = 6;
const CLASS_IMG = {
    samurai: "skiiltree/samurai.png",
    warrior: "skiiltree/warrior.png",
    mage: "skiiltree/mage.png",
    archer: "skiiltree/archer.png",
};
class SkillNode {
    id;
    nodeId;
    type;
    classAffinity;
    x;
    y;
    label;
    name;
    stat;
    value;
    def;
    mods;
    connections;
    constructor(id, nodeId, type, classAffinity, x, y, data) {
        this.id = id;
        this.nodeId = nodeId;
        this.type = type;
        this.classAffinity = classAffinity;
        this.x = x;
        this.y = y;
        this.label = data.label;
        this.name = data.name || null;
        this.stat = data.stat || null;
        this.value = data.value || 0;
        this.def = (data instanceof skill_node_defs_1.NodeDef) ? data : null;
        this.mods = (data instanceof skill_node_defs_1.NodeDef) ? data.mods : [];
        this.connections = [];
    }
}
exports.SkillNode = SkillNode;
class SkillTreeBuilder {
    nodes;
    edges;
    emblems;
    _nextId;
    _minorIdx;
    _notableIdx;
    _keystoneIdx;
    _rng;
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
    createNode(nodeId, type, cls, x, y, data) {
        const node = new SkillNode(this._nextId++, nodeId, type, cls, x, y, data);
        this.nodes.push(node);
        return node;
    }
    nextMinor() { return skill_node_defs_1.MINOR_POOL[this._minorIdx++ % skill_node_defs_1.MINOR_POOL.length]; }
    nextNotable() { return skill_node_defs_1.NOTABLE_POOL[this._notableIdx++ % skill_node_defs_1.NOTABLE_POOL.length]; }
    nextKeystone() { return skill_node_defs_1.KEYSTONE_POOL[this._keystoneIdx++ % skill_node_defs_1.KEYSTONE_POOL.length]; }
    link(a, b) {
        if (a.connections.includes(b.id))
            return;
        a.connections.push(b.id);
        b.connections.push(a.id);
        this.edges.push([a.id, b.id]);
    }
    jit(v, amt) { return v + (this._rng() - 0.5) * amt; }
    polar(angle, r) {
        return [CX + Math.cos(angle) * r, CY + Math.sin(angle) * r];
    }
    rng() { return this._rng(); }
    addEmblem(classId, cx, cy, startNodeId) {
        this.emblems.push({
            classId, cx, cy,
            r: exports.EMBLEM_RADIUS,
            img: CLASS_IMG[classId],
            startNodeId,
        });
    }
    build() {
        return { nodes: this.nodes, edges: this.edges, emblems: this.emblems };
    }
}
exports.SkillTreeBuilder = SkillTreeBuilder;
let _cachedTree = null;
function buildSkillTree() {
    if (_cachedTree)
        return _cachedTree;
    const b = new SkillTreeBuilder();
    function growTendril(parent, angle, startR, depth, stemLen, cls, branchTag) {
        if (depth <= 0)
            return;
        const step = 55 + b.rng() * 12;
        let prev = parent;
        let r = startR;
        for (let i = 0; i < stemLen; i++) {
            r += step;
            const a = angle + (b.rng() - 0.5) * 0.06;
            const [x, y] = b.polar(a, r);
            const n = b.createNode(`${cls}-tendril-${branchTag}-d${depth}-s${i}`, "minor", cls, b.jit(x, 3), b.jit(y, 3), b.nextMinor());
            b.link(prev, n);
            prev = n;
        }
        if (depth === 1) {
            r += step * 0.7;
            const [x, y] = b.polar(angle + (b.rng() - 0.5) * 0.04, r);
            const n = b.createNode(`${cls}-tendril-${branchTag}-d${depth}-tip`, "notable", cls, b.jit(x, 3), b.jit(y, 3), b.nextNotable());
            b.link(prev, n);
            return;
        }
        const splay = 0.28 + b.rng() * 0.08;
        growTendril(prev, angle - splay, r, depth - 1, stemLen, cls, `${branchTag}L`);
        growTendril(prev, angle + splay, r, depth - 1, stemLen, cls, `${branchTag}R`);
    }
    const START_OFFSET_ANGLE = {
        samurai: -Math.PI / 2,
        warrior: 0,
        mage: Math.PI / 2,
        archer: Math.PI,
    };
    const START_OFFSET_R = exports.EMBLEM_RADIUS;
    const starts = [];
    for (let ci = 0; ci < 4; ci++) {
        const cls = exports.CLASS_IDS[ci];
        const a = CLASS_ANGLE[cls] - Math.PI / 2;
        const [ecx, ecy] = b.polar(a, START_RADIUS);
        const oa = START_OFFSET_ANGLE[cls];
        const sx = ecx + Math.cos(oa) * START_OFFSET_R;
        const sy = ecy + Math.sin(oa) * START_OFFSET_R;
        const n = b.createNode(`${cls}-start`, "start", cls, sx, sy, { label: cls[0].toUpperCase() + cls.slice(1) });
        starts.push(n);
        b.addEmblem(cls, ecx, ecy, n.id);
    }
    for (let ci = 0; ci < 4; ci++) {
        const cls = exports.CLASS_IDS[ci];
        const skills = skill_node_defs_1.CLASS_SKILLS[cls];
        const em = b.emblems[ci];
        const ecx = em.cx, ecy = em.cy;
        const startA = START_OFFSET_ANGLE[cls];
        const centerA = startA + Math.PI;
        const fanSpan = Math.PI * 1.4;
        let si = 0;
        function emPolar(angle, r) {
            return [ecx + Math.cos(angle) * r, ecy + Math.sin(angle) * r];
        }
        const r1 = 30;
        const tier1 = [];
        for (let j = 0; j < 3; j++) {
            const a = centerA + (j - 1) * (fanSpan / 3);
            const [nx, ny] = emPolar(a, r1);
            const n = b.createNode(`${cls}-cs-${si}`, "classSkill", cls, nx, ny, skills[si]);
            si++;
            b.link(starts[ci], n);
            tier1.push(n);
        }
        const r2 = 58;
        const tier2 = [];
        for (let j = 0; j < 3; j++) {
            const parentA = centerA + (j - 1) * (fanSpan / 3);
            const pair = [];
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
        const r3 = 82;
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 2; k++) {
                if (si >= 16)
                    break;
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
    const R0 = START_RADIUS + exports.EMBLEM_RADIUS;
    const innerRing = [];
    for (let ci = 0; ci < 4; ci++) {
        const cls = exports.CLASS_IDS[ci];
        const base = CLASS_ANGLE[cls] - Math.PI / 2;
        const sn = [];
        for (let j = 0; j < 3; j++) {
            const a = base + (j - 1) * 0.30;
            const [x, y] = b.polar(a, R0 + 45 + (b.rng() - 0.5) * 6);
            const n = b.createNode(`${cls}-inner-${j}`, "minor", cls, b.jit(x, 3), b.jit(y, 3), b.nextMinor());
            b.link(starts[ci], n);
            sn.push(n);
        }
        innerRing.push(sn);
    }
    const trunkRing = [];
    for (let ci = 0; ci < 4; ci++) {
        const cls = exports.CLASS_IDS[ci];
        const base = CLASS_ANGLE[cls] - Math.PI / 2;
        const sn = [];
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
    const branchRing = [];
    for (let ci = 0; ci < 4; ci++) {
        const cls = exports.CLASS_IDS[ci];
        const base = CLASS_ANGLE[cls] - Math.PI / 2;
        const sn = [];
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
    for (let ci = 0; ci < 4; ci++) {
        const cls = exports.CLASS_IDS[ci];
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
    for (let ci = 0; ci < 4; ci++) {
        const cls = exports.CLASS_IDS[ci];
        const base = CLASS_ANGLE[cls] - Math.PI / 2;
        for (let j = 0; j < 2; j++) {
            const a = base + (j === 0 ? -0.42 : 0.42);
            const [x, y] = b.polar(a, R0 + 520 + (b.rng() - 0.5) * 10);
            const ks = b.createNode(`${cls}-keystone-${j}`, "keystone", cls, x, y, b.nextKeystone());
            let best = null, bestD = Infinity;
            for (const n of b.nodes) {
                if (n.type === "keystone" || n.type === "classSkill" || n.type === "start")
                    continue;
                if (n.classAffinity !== cls)
                    continue;
                const d = (n.x - ks.x) ** 2 + (n.y - ks.y) ** 2;
                if (d < bestD) {
                    bestD = d;
                    best = n;
                }
            }
            if (best)
                b.link(best, ks);
        }
    }
    for (let ci = 0; ci < 4; ci++) {
        const next = (ci + 1) % 4;
        b.link(trunkRing[ci][4], trunkRing[next][0]);
    }
    _cachedTree = b.build();
    return _cachedTree;
}
function getClassStartNode(classId) {
    return exports.CLASS_IDS.indexOf(classId);
}
//# sourceMappingURL=skill-tree.js.map