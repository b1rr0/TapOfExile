export declare class CombatSession {
    id: string;
    playerTelegramId: string;
    characterId: string;
    mode: string;
    locationId: string | null;
    mapTier: number | null;
    bossId: string | null;
    totalMonsters: number;
    monstersKilled: number;
    totalGoldEarned: string;
    totalXpEarned: string;
    totalTaps: number;
    startedAt: Date;
    completedAt: Date | null;
    status: string;
}
