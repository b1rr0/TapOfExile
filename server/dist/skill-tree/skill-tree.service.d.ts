import { Repository } from 'typeorm';
import { SkillAllocation } from '../shared/entities/skill-allocation.entity';
import { Character } from '../shared/entities/character.entity';
import { Player } from '../shared/entities/player.entity';
import { RedisService } from '../redis/redis.service';
export interface CachedNode {
    id: number;
    nodeId: string;
    type: string;
    classAffinity: string;
    connections: number[];
    label: string;
    name: string | null;
    mods: {
        stat: string;
        value: number;
        mode: string;
    }[];
}
interface CachedSkillTree {
    nodes: CachedNode[];
    edges: [number, number][];
    emblems: {
        classId: string;
        cx: number;
        cy: number;
        r: number;
        startNodeId: number;
    }[];
}
export declare class SkillTreeService {
    private allocRepo;
    private charRepo;
    private playerRepo;
    private redis;
    constructor(allocRepo: Repository<SkillAllocation>, charRepo: Repository<Character>, playerRepo: Repository<Player>, redis: RedisService);
    getSkillTree(): Promise<CachedSkillTree>;
    getAllocations(characterId: string): Promise<number[]>;
    getTreeWithAllocations(telegramId: string, characterId: string): Promise<{
        allocated: number[];
        nodes: CachedNode[];
        edges: [number, number][];
        emblems: {
            classId: string;
            cx: number;
            cy: number;
            r: number;
            startNodeId: number;
        }[];
    }>;
    allocateNode(telegramId: string, characterId: string, nodeId: number): Promise<{
        allocated: number[];
        bonuses: {
            percent: Record<string, number>;
            flat: Record<string, number>;
        };
    }>;
    resetAllocations(telegramId: string, characterId: string): Promise<{
        cost: number;
        allocated: never[];
    }>;
    private computeBonuses;
}
export {};
