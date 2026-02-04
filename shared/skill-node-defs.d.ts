import type { ModMode } from "./types";
export declare class StatModifier {
    readonly stat: string;
    readonly value: number;
    readonly mode: ModMode;
    constructor(stat: string, value: number, mode?: ModMode);
}
export declare class NodeDef {
    readonly id: string;
    readonly label: string;
    readonly name: string | null;
    readonly type: string;
    readonly mods: StatModifier[];
    readonly stat: string | null;
    readonly value: number;
    constructor(id: string, label: string, name: string | null, type: string, ...mods: StatModifier[]);
}
export declare function pct(stat: string, value: number): StatModifier;
export declare function flat(stat: string, value: number): StatModifier;
export declare function minor(id: string, label: string, ...mods: StatModifier[]): NodeDef;
export declare function notable(id: string, label: string, name: string, ...mods: StatModifier[]): NodeDef;
export declare function keystone(id: string, label: string, name: string, ...mods: StatModifier[]): NodeDef;
export declare function classSkill(id: string, label: string, name: string, ...mods: StatModifier[]): NodeDef;
export declare const STAT_TO_PLAYER: Record<string, string>;
export declare const MINOR_POOL: NodeDef[];
export declare const NOTABLE_POOL: NodeDef[];
export declare const KEYSTONE_POOL: NodeDef[];
export declare const CLASS_SKILLS: Record<string, NodeDef[]>;
export declare function computeAllocatedBonuses(nodes: {
    type: string;
    mods: StatModifier[];
    stat: string | null;
    value: number;
}[], allocated: Set<number>): {
    percent: Record<string, number>;
    flat: Record<string, number>;
};
