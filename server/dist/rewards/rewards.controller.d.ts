import { RewardsService } from './rewards.service';
export declare class RewardsController {
    private rewardsService;
    constructor(rewardsService: RewardsService);
    getDailyInfo(telegramId: string): Promise<{
        day: number;
        streak: number;
        canClaim: boolean;
        hoursUntilClaim: number;
        reward: {
            day: number;
            type: string;
            data: {
                amount: number;
                tier?: undefined;
            };
        } | {
            day: number;
            type: string;
            data: {
                tier: number;
                amount?: undefined;
            };
        };
    }>;
    claimDaily(telegramId: string): Promise<{
        claimed: {
            day: number;
            type: string;
            data: {
                amount: number;
                tier?: undefined;
            };
        } | {
            day: number;
            type: string;
            data: {
                tier: number;
                amount?: undefined;
            };
        };
        nextDay: number;
        streak: number;
    }>;
    getAchievements(): Promise<({
        id: string;
        name: string;
        description: string;
        reward: {
            type: string;
            amount: number;
            tier?: undefined;
        };
    } | {
        id: string;
        name: string;
        description: string;
        reward: {
            type: string;
            tier: number;
            amount?: undefined;
        };
    })[]>;
}
