import { SkillTreeService } from './skill-tree.service';
export declare class SkillTreeController {
    private skillTreeService;
    constructor(skillTreeService: SkillTreeService);
    getTree(telegramId: string, characterId: string): Promise<{
        allocated: number[];
        nodes: import("./skill-tree.service").CachedNode[];
        edges: [number, number][];
        emblems: {
            classId: string;
            cx: number;
            cy: number;
            r: number;
            startNodeId: number;
        }[];
    }>;
    allocate(telegramId: string, characterId: string, nodeId: number): Promise<{
        allocated: number[];
        bonuses: {
            percent: Record<string, number>;
            flat: Record<string, number>;
        };
    }>;
    reset(telegramId: string, characterId: string): Promise<{
        cost: number;
        allocated: never[];
    }>;
}
