import { PlayerService } from './player.service';
export declare class PlayerController {
    private playerService;
    constructor(playerService: PlayerService);
    getPlayerState(telegramId: string): Promise<{
        gold: string;
        activeCharacterId: string | null;
        characters: {
            id: string;
            nickname: string;
            classId: string;
            skinId: string;
            createdAt: number;
            level: number;
            xp: number;
            xpToNext: number;
            tapDamage: number;
            critChance: number;
            critMultiplier: number;
            passiveDps: number;
            combat: {
                currentStage: number;
                currentWave: number;
                wavesPerStage: number;
            };
            locations: {
                completed: string[];
                current: string | null;
                currentAct: number;
            };
            inventory: {
                items: never[];
                equipment: Record<string, unknown>;
            };
            bag: {
                id: string;
                name: string;
                type: string;
                quality: string;
                level: number | null;
                icon: string | null;
                acquiredAt: number;
                tier: number | null;
                locationId: string | null;
                locationAct: number | null;
                bossId: string | null;
                bossKeyTier: number | null;
            }[];
            endgame: {
                unlocked: boolean;
                completedBosses: string[];
                highestTierCompleted: number;
                totalMapsRun: number;
            };
        }[];
        meta: {
            lastSaveTime: number;
            totalTaps: number;
            totalKills: number;
            totalGold: number;
            version: number;
        };
    }>;
}
