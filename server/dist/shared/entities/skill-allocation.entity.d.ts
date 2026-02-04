import { Character } from './character.entity';
export declare class SkillAllocation {
    id: number;
    characterId: string;
    character: Character;
    nodeId: number;
    allocatedAt: Date;
}
