export type ModMode = "percent" | "flat";
export type NodeType = "start" | "classSkill" | "minor" | "notable" | "keystone";
export interface MonsterSpawn {
    type: string;
    count: number;
    rarity: string;
}
export interface Wave {
    monsters: MonsterSpawn[];
}
export interface MapTier {
    tier: number;
    name: string;
    hpMul: number;
    goldMul: number;
    xpMul: number;
}
export interface BossKeyTierDef {
    tier: number;
    name: string;
    quality: string;
    hpScale: number;
    goldScale: number;
    xpScale: number;
}
export interface BossMap {
    id: string;
    name: string;
    description: string;
    bossType: string;
    icon: string;
    hpMul: number;
    goldMul: number;
    xpMul: number;
    trashWaves: Wave[];
}
export interface DropSettings {
    regular: {
        sameTierChance: number;
        tierUpChance: number;
        bossKeyChance: number;
        bossKeyMinTier: number;
    };
    boss: {
        guaranteedTierMin: number;
        guaranteedTierMax: number;
        bonusKeyChance: number;
        bossKeyChance: number;
    };
}
export interface BagItemData {
    id: string;
    name: string;
    type: string;
    quality: string;
    level?: number;
    icon?: string;
    acquiredAt: number;
    tier?: number;
    locationId?: string;
    locationAct?: number;
    bossId?: string;
    bossKeyTier?: number;
}
