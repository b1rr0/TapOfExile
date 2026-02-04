import { Character } from './character.entity';
export declare class BagItem {
    id: string;
    characterId: string;
    character: Character;
    name: string;
    type: string;
    quality: string;
    level: number | null;
    icon: string | null;
    acquiredAt: string;
    tier: number | null;
    locationId: string | null;
    locationAct: number | null;
    bossId: string | null;
    bossKeyTier: number | null;
}
