export declare class DailyReward {
    id: number;
    playerTelegramId: string;
    day: number;
    rewardType: string;
    rewardData: Record<string, unknown>;
    claimedAt: Date;
}
