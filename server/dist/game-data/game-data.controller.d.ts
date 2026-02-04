import { GameDataService } from './game-data.service';
export declare class GameDataController {
    private gameDataService;
    constructor(gameDataService: GameDataService);
    getBalance(): Promise<{}>;
    getVersion(): Promise<{
        version: number;
        minClientVersion: number;
    }>;
    getClasses(): Promise<{
        id: string;
        name: string;
        skinId: string;
        description: string;
        icon: string;
    }[]>;
    getEndgame(): Promise<{
        tiers: {
            tier: number;
            name: string;
            hpMul: number;
            goldMul: number;
            xpMul: number;
        }[];
        dropSettings: {
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
        };
        bossKeyTiers: {
            tier: number;
            name: string;
            quality: string;
            hpScale: number;
            goldScale: number;
            xpScale: number;
        }[];
    }>;
}
