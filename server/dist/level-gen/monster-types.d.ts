export interface Rarity {
    id: string;
    label: string;
    color: string;
    hpMul: number;
    goldMul: number;
    xpMul: number;
}
export interface MonsterType {
    name: string;
    cssClass: string;
    minStage: number;
    bodyColor: string;
    eyeColor: string;
}
export declare const RARITIES: Record<string, Rarity>;
export declare const MONSTER_TYPES: MonsterType[];
