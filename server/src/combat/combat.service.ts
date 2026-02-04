import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../redis/redis.service';
import { LevelGenService, ServerMonster } from '../level-gen/level-gen.service';
import { Character } from '../shared/entities/character.entity';
import { Player } from '../shared/entities/player.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { CombatSession } from '../shared/entities/combat-session.entity';
import { B } from '../shared/constants/balance.constants';

interface RedisCombatSession {
  id: string;
  playerId: string;
  characterId: string;
  leagueId: string;
  playerLeagueId: string;
  mode: 'location' | 'map' | 'boss_map';
  monsterQueue: ServerMonster[];
  currentIndex: number;
  totalGoldEarned: number;
  totalXpEarned: number;
  totalTaps: number;
  lastTapTime: number;
  startedAt: number;
  locationId?: string;
  mapTier?: number;
  bossId?: string;
}

const SESSION_TTL = 1800; // 30 minutes
const MIN_TAP_INTERVAL_MS = 50; // 20 taps/sec max

@Injectable()
export class CombatService {
  constructor(
    private redis: RedisService,
    private levelGen: LevelGenService,
    @InjectRepository(Character)
    private charRepo: Repository<Character>,
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
    @InjectRepository(PlayerLeague)
    private playerLeagueRepo: Repository<PlayerLeague>,
    @InjectRepository(CombatSession)
    private sessionRepo: Repository<CombatSession>,
  ) {}

  private sessionKey(id: string) {
    return `combat:session:${id}`;
  }

  /**
   * Get active character from the player's active league.
   */
  private async getActiveCharacterInfo(telegramId: string) {
    const player = await this.playerRepo.findOne({ where: { telegramId } });
    if (!player || !player.activeLeagueId) {
      throw new BadRequestException('No active league');
    }

    const pl = await this.playerLeagueRepo.findOne({
      where: {
        playerTelegramId: telegramId,
        leagueId: player.activeLeagueId,
      },
    });
    if (!pl || !pl.activeCharacterId) {
      throw new BadRequestException('No active character');
    }

    return { player, playerLeague: pl };
  }

  /**
   * Start a location combat session.
   */
  async startLocation(telegramId: string, locationId: string, waves: any[], locationOrder: number, actNumber: number) {
    const { playerLeague } = await this.getActiveCharacterInfo(telegramId);

    const queue = this.levelGen.buildMonsterQueue(
      waves,
      locationOrder,
      actNumber,
    );

    const sessionId = uuidv4();
    const session: RedisCombatSession = {
      id: sessionId,
      playerId: telegramId,
      characterId: playerLeague.activeCharacterId!,
      leagueId: playerLeague.leagueId,
      playerLeagueId: playerLeague.id,
      mode: 'location',
      monsterQueue: queue,
      currentIndex: 0,
      totalGoldEarned: 0,
      totalXpEarned: 0,
      totalTaps: 0,
      lastTapTime: 0,
      startedAt: Date.now(),
      locationId,
    };

    await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);

    return {
      sessionId,
      totalMonsters: queue.length,
      currentMonster: queue[0] || null,
    };
  }

  /**
   * Start an endgame map combat session.
   */
  async startMap(
    telegramId: string,
    waves: any[],
    tierHpMul: number,
    tierGoldMul: number,
    tierXpMul: number,
    mapTier: number,
    bossId?: string,
  ) {
    const { playerLeague } = await this.getActiveCharacterInfo(telegramId);

    const queue = this.levelGen.buildMonsterQueue(
      waves,
      undefined,
      undefined,
      tierHpMul,
      tierGoldMul,
      tierXpMul,
    );

    const sessionId = uuidv4();
    const session: RedisCombatSession = {
      id: sessionId,
      playerId: telegramId,
      characterId: playerLeague.activeCharacterId!,
      leagueId: playerLeague.leagueId,
      playerLeagueId: playerLeague.id,
      mode: bossId ? 'boss_map' : 'map',
      monsterQueue: queue,
      currentIndex: 0,
      totalGoldEarned: 0,
      totalXpEarned: 0,
      totalTaps: 0,
      lastTapTime: 0,
      startedAt: Date.now(),
      mapTier,
      bossId,
    };

    await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);

    return {
      sessionId,
      totalMonsters: queue.length,
      currentMonster: queue[0] || null,
    };
  }

  /**
   * Process a tap — server-authoritative damage calculation.
   */
  async processTap(telegramId: string, sessionId: string) {
    const session = await this.redis.getJson<RedisCombatSession>(
      this.sessionKey(sessionId),
    );
    if (!session || session.playerId !== telegramId) {
      throw new NotFoundException('Combat session not found');
    }

    // Rate limit: min 50ms between taps
    const now = Date.now();
    if (now - session.lastTapTime < MIN_TAP_INTERVAL_MS) {
      throw new BadRequestException('Tap too fast');
    }

    // Get character stats from DB (server-authoritative)
    const char = await this.charRepo.findOne({
      where: { id: session.characterId },
    });
    if (!char) throw new NotFoundException('Character not found');

    // Calculate damage
    const isCrit = Math.random() < char.critChance;
    let damage = char.tapDamage;
    if (isCrit) {
      damage = Math.floor(damage * char.critMultiplier);
    }

    // Apply damage to current monster
    const monster = session.monsterQueue[session.currentIndex];
    if (!monster) {
      throw new BadRequestException('No monster to attack');
    }

    monster.currentHp -= damage;
    session.totalTaps++;
    session.lastTapTime = now;

    let killed = false;

    if (monster.currentHp <= 0) {
      monster.currentHp = 0;
      killed = true;
      session.totalGoldEarned += monster.goldReward;
      session.totalXpEarned += monster.xpReward;
      session.currentIndex++;
    }

    const isComplete = session.currentIndex >= session.monsterQueue.length;
    await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);

    return {
      damage,
      isCrit,
      monsterHp: monster.currentHp,
      monsterMaxHp: monster.maxHp,
      killed,
      isComplete,
      currentMonster: !isComplete ? session.monsterQueue[session.currentIndex] : null,
      monstersRemaining: session.monsterQueue.length - session.currentIndex,
    };
  }

  /**
   * Complete a combat session and award rewards.
   * Gold → PlayerLeague, XP → Character, meta stats → Player.
   */
  async completeSession(telegramId: string, sessionId: string) {
    const session = await this.redis.getJson<RedisCombatSession>(
      this.sessionKey(sessionId),
    );
    if (!session || session.playerId !== telegramId) {
      throw new NotFoundException('Combat session not found');
    }

    if (session.currentIndex < session.monsterQueue.length) {
      throw new BadRequestException('Not all monsters killed');
    }

    // Award gold to PlayerLeague (per-league gold pool)
    const playerLeague = await this.playerLeagueRepo.findOne({
      where: { id: session.playerLeagueId },
    });
    if (!playerLeague) throw new NotFoundException('PlayerLeague not found');

    playerLeague.gold = String(
      BigInt(playerLeague.gold) + BigInt(session.totalGoldEarned),
    );
    await this.playerLeagueRepo.save(playerLeague);

    // Update global lifetime meta stats on Player
    const player = await this.playerRepo.findOne({
      where: { telegramId },
    });
    if (!player) throw new NotFoundException('Player not found');

    player.totalGold = String(
      BigInt(player.totalGold) + BigInt(session.totalGoldEarned),
    );
    player.totalKills = String(
      BigInt(player.totalKills) + BigInt(session.monsterQueue.length),
    );
    player.totalTaps = String(
      BigInt(player.totalTaps) + BigInt(session.totalTaps),
    );
    player.lastSaveTime = String(Date.now());
    await this.playerRepo.save(player);

    // Award XP to character
    const char = await this.charRepo.findOne({
      where: { id: session.characterId },
    });
    if (char) {
      char.xp = String(BigInt(char.xp) + BigInt(session.totalXpEarned));
      while (BigInt(char.xp) >= BigInt(char.xpToNext)) {
        char.xp = String(BigInt(char.xp) - BigInt(char.xpToNext));
        char.level++;
        char.xpToNext = String(
          Math.floor(B.XP_BASE * Math.pow(B.XP_GROWTH, char.level - 1)),
        );
      }
      await this.charRepo.save(char);
    }

    // Save audit record to PostgreSQL
    const auditSession = this.sessionRepo.create({
      id: session.id,
      playerTelegramId: telegramId,
      characterId: session.characterId,
      leagueId: session.leagueId,
      mode: session.mode,
      locationId: session.locationId || null,
      mapTier: session.mapTier || null,
      bossId: session.bossId || null,
      totalMonsters: session.monsterQueue.length,
      monstersKilled: session.monsterQueue.length,
      totalGoldEarned: String(session.totalGoldEarned),
      totalXpEarned: String(session.totalXpEarned),
      totalTaps: session.totalTaps,
      completedAt: new Date(),
      status: 'completed',
    });
    await this.sessionRepo.save(auditSession);

    // Clean up Redis
    await this.redis.del(this.sessionKey(sessionId));

    return {
      totalGold: session.totalGoldEarned,
      totalXp: session.totalXpEarned,
      totalTaps: session.totalTaps,
      monstersKilled: session.monsterQueue.length,
      levelUp: char ? char.level : undefined,
    };
  }

  /**
   * Flee from combat (abandon session, no rewards).
   */
  async fleeCombat(telegramId: string, sessionId: string) {
    const session = await this.redis.getJson<RedisCombatSession>(
      this.sessionKey(sessionId),
    );
    if (!session || session.playerId !== telegramId) {
      throw new NotFoundException('Combat session not found');
    }

    await this.redis.del(this.sessionKey(sessionId));

    return { success: true };
  }
}
