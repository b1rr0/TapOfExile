import { NodeDef, StatModifier } from "./skill-node-defs";
import type { NodeType } from "./types";
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
export declare const CLASS_IDS: string[];
export declare const EMBLEM_RADIUS: number;
export declare const MAX_CLASS_SKILLS: number;
export declare class SkillNode {
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
    constructor(id: number, nodeId: string, type: NodeType, classAffinity: string, x: number, y: number, data: NodeDef | {
        label: string;
        name?: string | null;
        stat?: string | null;
        value?: number;
    });
}
export declare class SkillTreeBuilder {
    nodes: SkillNode[];
    edges: [number, number][];
    emblems: Emblem[];
    _nextId: number;
    _minorIdx: number;
    _notableIdx: number;
    _keystoneIdx: number;
    _rng: () => number;
    constructor();
    createNode(nodeId: string, type: NodeType, cls: string, x: number, y: number, data: NodeDef | {
        label: string;
        name?: string | null;
        stat?: string | null;
        value?: number;
    }): SkillNode;
    nextMinor(): NodeDef;
    nextNotable(): NodeDef;
    nextKeystone(): NodeDef;
    link(a: SkillNode, b: SkillNode): void;
    jit(v: number, amt: number): number;
    polar(angle: number, r: number): [number, number];
    rng(): number;
    addEmblem(classId: string, cx: number, cy: number, startNodeId: number): void;
    build(): SkillTreeResult;
}
export declare function buildSkillTree(): SkillTreeResult;
export declare function getClassStartNode(classId: string): number;
