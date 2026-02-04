import { Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { LevelGenService, ServerMonster } from '../level-gen/level-gen.service';
import { Character } from '../shared/entities/character.entity';
import { Player } from '../shared/entities/player.entity';
import { CombatSession } from '../shared/entities/combat-session.entity';
export declare class CombatService {
    private redis;
    private levelGen;
    private charRepo;
    private playerRepo;
    private sessionRepo;
    constructor(redis: RedisService, levelGen: LevelGenService, charRepo: Repository<Character>, playerRepo: Repository<Player>, sessionRepo: Repository<CombatSession>);
    private sessionKey;
    startLocation(telegramId: string, locationId: string, waves: any[], locationOrder: number, actNumber: number): Promise<{
        sessionId: string;
        totalMonsters: number;
        currentMonster: ServerMonster;
    }>;
    startMap(telegramId: string, waves: any[], tierHpMul: number, tierGoldMul: number, tierXpMul: number, mapTier: number, bossId?: string): Promise<{
        sessionId: string;
        totalMonsters: number;
        currentMonster: ServerMonster;
    }>;
    processTap(telegramId: string, sessionId: string): Promise<{
        damage: number;
        isCrit: boolean;
        monsterHp: number;
        monsterMaxHp: number;
        killed: boolean;
        isComplete: boolean;
        currentMonster: ServerMonster | null;
        monstersRemaining: number;
    }>;
    completeSession(telegramId: string, sessionId: string): Promise<{
        totalGold: number;
        totalXp: number;
        totalTaps: number;
        monstersKilled: number;
        levelUp: number | undefined;
    }>;
    fleeCombat(telegramId: string, sessionId: string): Promise<{
        success: boolean;
    }>;
}
