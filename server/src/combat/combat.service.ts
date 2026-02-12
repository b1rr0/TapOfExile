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
import { LootService } from '../loot/loot.service';
import { EndgameService } from '../endgame/endgame.service';
import { Character } from '../shared/entities/character.entity';
import { Player } from '../shared/entities/player.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { CombatSession } from '../shared/entities/combat-session.entity';
import { BagItem } from '../shared/entities/bag-item.entity';
import { B } from '../shared/constants/balance.constants';
import {
  getTierDef,
  getBossKeyTierDef,
  getWavesForTier as sharedGetWavesForTier,
  getBossMapWaves as sharedGetBossMapWaves,
} from '@shared/endgame-maps';
import { StartLocationDto } from './dto/start-location.dto';
import { StartMapDto } from './dto/start-map.dto';
import { computeElementalDamage } from './elemental-damage';
import { statsAtLevel, specialAtLevel, MAX_LEVEL, CLASS_DEFS } from '@shared/class-stats';
import type { DamageBreakdown } from '@shared/types';

export interface RedisCombatSession {
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
  direction?: string;
  // Enemy attack system
  playerCurrentHp: number;
  playerMaxHp: number;
  lastEnemyAttackTime: number;
}

export interface EnemyAttackResult {
  dodged: boolean;
  blocked?: boolean;
  damage: number;
  breakdown: DamageBreakdown | null;
}

const SESSION_TTL = 1800; // 30 minutes
const MIN_TAP_INTERVAL_MS = 50; // 20 taps/sec max
const DAILY_BONUS_WINS_MAX = 3; // First 3 wins per day give x3 XP
const DAILY_BONUS_XP_MULTIPLIER = 3;

/**
 * Get current UTC date as YYYY-MM-DD string.
 */
function getUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class CombatService {
  constructor(
    private redis: RedisService,
    private levelGen: LevelGenService,
    private lootService: LootService,
    private endgameService: EndgameService,
    @InjectRepository(Character)
    private charRepo: Repository<Character>,
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
    @InjectRepository(PlayerLeague)
    private playerLeagueRepo: Repository<PlayerLeague>,
    @InjectRepository(CombatSession)
    private sessionRepo: Repository<CombatSession>,
    @InjectRepository(BagItem)
    private bagRepo: Repository<BagItem>,
  ) {}

  sessionKey(id: string) {
    return `combat:session:${id}`;
  }

  /** Read a combat session from Redis (used by gateway for reconnect). */
  async getSession(sessionId: string): Promise<RedisCombatSession | null> {
    return this.redis.getJson<RedisCombatSession>(this.sessionKey(sessionId));
  }

  /** Write a combat session back to Redis (used by gateway for reconnect). */
  async saveSession(sessionId: string, session: RedisCombatSession): Promise<void> {
    await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);
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

    const char = await this.charRepo.findOne({
      where: { id: playerLeague.activeCharacterId! },
    });
    if (!char) throw new NotFoundException('Character not found');

    const queue = this.levelGen.buildMonsterQueue(
      waves,
      locationOrder,
      actNumber,
    );

    const now = Date.now();
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
      startedAt: now,
      locationId,
      playerCurrentHp: char.maxHp,
      playerMaxHp: char.maxHp,
      lastEnemyAttackTime: now,
    };

    await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);

    return {
      sessionId,
      totalMonsters: queue.length,
      currentMonster: queue[0] || null,
      playerHp: char.maxHp,
      playerMaxHp: char.maxHp,
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

    const char = await this.charRepo.findOne({
      where: { id: playerLeague.activeCharacterId! },
    });
    if (!char) throw new NotFoundException('Character not found');

    const queue = this.levelGen.buildMonsterQueue(
      waves,
      undefined,
      undefined,
      tierHpMul,
      tierGoldMul,
      tierXpMul,
    );

    const now = Date.now();
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
      startedAt: now,
      mapTier,
      bossId,
      playerCurrentHp: char.maxHp,
      playerMaxHp: char.maxHp,
      lastEnemyAttackTime: now,
    };

    await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);

    return {
      sessionId,
      totalMonsters: queue.length,
      currentMonster: queue[0] || null,
      playerHp: char.maxHp,
      playerMaxHp: char.maxHp,
    };
  }

  /**
   * Start location via DTO from controller.
   */
  async startLocationByDto(telegramId: string, dto: StartLocationDto) {
    return this.startLocation(
      telegramId,
      dto.locationId,
      dto.waves,
      dto.order,
      dto.act,
    );
  }

  /**
   * Start map via DTO from controller — consumes the map key from bag.
   */
  async startMapByDto(telegramId: string, dto: StartMapDto) {
    const { playerLeague } = await this.getActiveCharacterInfo(telegramId);

    // Find the map key in bag
    const key = await this.bagRepo.findOne({
      where: { id: dto.mapKeyItemId, playerLeagueId: playerLeague.id },
    });
    if (!key) {
      throw new NotFoundException('Map key not found in bag');
    }

    // Determine waves and tier based on key type
    let waves: any[];
    let tierHpMul: number;
    let tierGoldMul: number;
    let tierXpMul: number;
    let mapTier: number;
    let bossId: string | undefined;

    if (key.type === 'boss_map_key') {
      // Boss map key — use shared boss key tier defs
      bossId = key.bossId || undefined;
      mapTier = 10;
      const bkt = getBossKeyTierDef(key.bossKeyTier || 1);
      tierHpMul = bkt.hpScale;
      tierGoldMul = bkt.goldScale;
      tierXpMul = bkt.xpScale;
      waves = sharedGetBossMapWaves(bossId!);
    } else {
      // Regular map key — use shared tier definitions (correct multipliers!)
      mapTier = key.tier || 1;
      const tierDef = getTierDef(mapTier);
      tierHpMul = tierDef.hpMul;
      tierGoldMul = tierDef.goldMul;
      tierXpMul = tierDef.xpMul;
      waves = sharedGetWavesForTier(mapTier);
    }

    // Remove the key from bag
    await this.bagRepo.remove(key);

    // Start the combat session
    const result = await this.startMap(
      telegramId,
      waves,
      tierHpMul,
      tierGoldMul,
      tierXpMul,
      mapTier,
      bossId,
    );

    // Store direction in session for drop calculation
    if (dto.direction) {
      const session = await this.redis.getJson<RedisCombatSession>(
        this.sessionKey(result.sessionId),
      );
      if (session) {
        session.direction = dto.direction;
        await this.redis.setJson(
          this.sessionKey(result.sessionId),
          session,
          SESSION_TTL,
        );
      }
    }

    return result;
  }

  /**
   * Calculate and apply accumulated enemy attacks since lastEnemyAttackTime.
   * Returns the list of individual attacks for the client to replay visually.
   */
  private processEnemyAttacks(
    session: RedisCombatSession,
    char: Character,
    now: number,
  ): { attacks: EnemyAttackResult[]; playerDead: boolean } {
    const monster = session.monsterQueue[session.currentIndex];
    if (!monster || session.playerCurrentHp <= 0) {
      return { attacks: [], playerDead: session.playerCurrentHp <= 0 };
    }

    const elapsed = now - session.lastEnemyAttackTime;
    const attackInterval = B.ENEMY_ATTACK_INTERVAL_MS;
    let pendingAttacks = Math.floor(elapsed / attackInterval);
    pendingAttacks = Math.min(pendingAttacks, B.MAX_PENDING_ATTACKS);

    if (pendingAttacks <= 0) return { attacks: [], playerDead: false };

    // Advance lastEnemyAttackTime by the number of attacks processed
    session.lastEnemyAttackTime += pendingAttacks * attackInterval;

    const attacks: EnemyAttackResult[] = [];
    const charResistance = char.resistance || {};
    const monsterDmgProfile = monster.outgoingDamage || { physical: 1.0 };

    for (let i = 0; i < pendingAttacks; i++) {
      if (session.playerCurrentHp <= 0) break;

      // Dodge check
      if (Math.random() < char.dodgeChance) {
        attacks.push({ dodged: true, damage: 0, breakdown: null });
        continue;
      }

      // Warrior block check (class special: blockChance)
      const classDef = CLASS_DEFS[char.classId];
      if (classDef?.special.id === 'blockChance' && Math.random() < char.specialValue) {
        attacks.push({ dodged: false, blocked: true, damage: 0, breakdown: null });
        continue;
      }

      // Compute elemental damage: monster's outgoing vs player's resistance
      const breakdown = computeElementalDamage(
        monster.scaledDamage,
        monsterDmgProfile,
        charResistance,
      );

      session.playerCurrentHp -= breakdown.total;
      if (session.playerCurrentHp < 0) session.playerCurrentHp = 0;

      attacks.push({
        dodged: false,
        damage: breakdown.total,
        breakdown,
      });
    }

    return {
      attacks,
      playerDead: session.playerCurrentHp <= 0,
    };
  }

  /**
   * Process one tick of enemy attacks (called by the WebSocket combat loop).
   * Returns attack results for the client, or null if session is gone.
   */
  async processEnemyTick(sessionId: string): Promise<{
    attacks: EnemyAttackResult[];
    playerHp: number;
    playerMaxHp: number;
    playerDead: boolean;
  } | null> {
    const session = await this.redis.getJson<RedisCombatSession>(
      this.sessionKey(sessionId),
    );
    if (!session) return null;

    // Already dead — nothing to do
    if (session.playerCurrentHp <= 0) {
      return { attacks: [], playerHp: 0, playerMaxHp: session.playerMaxHp, playerDead: true };
    }

    const char = await this.charRepo.findOne({
      where: { id: session.characterId },
    });
    if (!char) return null;

    const { attacks, playerDead } = this.processEnemyAttacks(session, char, Date.now());

    // Persist updated HP and lastEnemyAttackTime
    await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);

    return {
      attacks,
      playerHp: session.playerCurrentHp,
      playerMaxHp: session.playerMaxHp,
      playerDead,
    };
  }

  /**
   * Process a tap — server-authoritative damage calculation.
   * Enemy attacks are handled separately by the WebSocket combat loop.
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

    // Player already dead — reject tap
    if (session.playerCurrentHp <= 0) {
      return {
        damage: 0,
        damageBreakdown: null,
        isCrit: false,
        monsterHp: session.monsterQueue[session.currentIndex]?.currentHp ?? 0,
        monsterMaxHp: session.monsterQueue[session.currentIndex]?.maxHp ?? 0,
        killed: false,
        isComplete: false,
        currentMonster: session.monsterQueue[session.currentIndex] || null,
        monstersRemaining: session.monsterQueue.length - session.currentIndex,
        playerHp: 0,
        playerMaxHp: session.playerMaxHp,
        playerDead: true,
      };
    }

    // Get character stats from DB (server-authoritative)
    const char = await this.charRepo.findOne({
      where: { id: session.characterId },
    });
    if (!char) throw new NotFoundException('Character not found');

    // Calculate raw damage (before elemental split)
    const isCrit = Math.random() < char.critChance;
    let rawDamage = char.tapDamage;
    if (isCrit) {
      rawDamage = Math.floor(rawDamage * char.critMultiplier);
    }

    // Apply damage to current monster
    const monster = session.monsterQueue[session.currentIndex];
    if (!monster) {
      throw new BadRequestException('No monster to attack');
    }

    // Elemental damage: split by profile, reduce by resistance
    const damageProfile = char.elementalDamage || { physical: 1.0 };
    const monsterResistance = monster.resistance || {};
    const breakdown = computeElementalDamage(rawDamage, damageProfile, monsterResistance);

    monster.currentHp -= breakdown.total;
    session.totalTaps++;
    session.lastTapTime = now;

    let killed = false;

    if (monster.currentHp <= 0) {
      monster.currentHp = 0;
      killed = true;
      session.totalGoldEarned += monster.goldReward;
      session.totalXpEarned += monster.xpReward;
      session.currentIndex++;
      // Reset enemy attack timer for new monster
      session.lastEnemyAttackTime = now;
    }

    const isComplete = session.currentIndex >= session.monsterQueue.length;
    await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);

    return {
      damage: breakdown.total,
      damageBreakdown: breakdown,
      isCrit,
      monsterHp: monster.currentHp,
      monsterMaxHp: monster.maxHp,
      killed,
      isComplete,
      currentMonster: !isComplete ? session.monsterQueue[session.currentIndex] : null,
      monstersRemaining: session.monsterQueue.length - session.currentIndex,
      playerHp: session.playerCurrentHp,
      playerMaxHp: session.playerMaxHp,
      playerDead: false,
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
    let usedDailyBonus = false;
    let dailyBonusRemaining = DAILY_BONUS_WINS_MAX;

    if (char) {
      // Check and apply daily bonus (x3 XP for first 3 wins)
      const today = getUtcDateString();
      if (char.dailyBonusResetDate !== today) {
        // New day — reset counter
        char.dailyBonusWinsUsed = 0;
        char.dailyBonusResetDate = today;
      }

      let xpToAward = session.totalXpEarned;
      if (char.dailyBonusWinsUsed < DAILY_BONUS_WINS_MAX) {
        // Apply x3 XP bonus
        xpToAward = session.totalXpEarned * DAILY_BONUS_XP_MULTIPLIER;
        char.dailyBonusWinsUsed++;
        usedDailyBonus = true;
      }
      dailyBonusRemaining = Math.max(0, DAILY_BONUS_WINS_MAX - char.dailyBonusWinsUsed);

      char.xp = String(BigInt(char.xp) + BigInt(xpToAward));
      while (
        char.level < MAX_LEVEL &&
        BigInt(char.xp) >= BigInt(char.xpToNext)
      ) {
        char.xp = String(BigInt(char.xp) - BigInt(char.xpToNext));
        char.level++;
        char.xpToNext = String(
          Math.floor(B.XP_BASE * Math.pow(B.XP_GROWTH, char.level - 1)),
        );

        // Apply class-based stat growth
        const newStats = statsAtLevel(char.classId, char.level);
        char.maxHp = newStats.hp;
        char.hp = newStats.hp;
        char.tapDamage = newStats.tapDamage;
        char.critChance = newStats.critChance;
        char.critMultiplier = newStats.critMultiplier;
        char.dodgeChance = newStats.dodgeChance;
        char.specialValue = specialAtLevel(char.classId, char.level);
      }

      // Clamp XP at max level
      if (char.level >= MAX_LEVEL) {
        char.xp = '0';
      }

      // Persist location completion for story mode
      if (session.mode === 'location' && session.locationId) {
        if (!char.completedLocations.includes(session.locationId)) {
          char.completedLocations = [
            ...char.completedLocations,
            session.locationId,
          ];
        }
      }

      // Persist endgame stats for map/boss_map modes
      if (session.mode === 'map' || session.mode === 'boss_map') {
        char.totalMapsRun++;
        if (
          session.mode === 'map' &&
          session.mapTier &&
          session.mapTier > char.highestTierCompleted
        ) {
          char.highestTierCompleted = session.mapTier;
        }
        if (
          session.mode === 'boss_map' &&
          session.bossId &&
          !char.completedBosses.includes(session.bossId)
        ) {
          char.completedBosses = [
            ...char.completedBosses,
            session.bossId,
          ];
        }
      }

      await this.charRepo.save(char);
    }

    // Roll and persist map drops for endgame sessions
    let mapDrops: Partial<BagItem>[] = [];
    if (session.mode === 'map' || session.mode === 'boss_map') {
      const isBoss = session.mode === 'boss_map';
      const direction = session.direction || session.bossId || null;
      mapDrops = this.lootService.rollMapDrops(
        session.mapTier || 1,
        isBoss,
        direction,
      );
      if (mapDrops.length > 0) {
        await this.lootService.addItemsToBag(
          session.playerLeagueId,
          mapDrops,
        );
      }
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
      totalXp: usedDailyBonus ? session.totalXpEarned * DAILY_BONUS_XP_MULTIPLIER : session.totalXpEarned,
      baseXp: session.totalXpEarned,
      xpMultiplier: usedDailyBonus ? DAILY_BONUS_XP_MULTIPLIER : 1,
      totalTaps: session.totalTaps,
      monstersKilled: session.monsterQueue.length,
      level: char ? char.level : undefined,
      xp: char ? Number(char.xp) : undefined,
      xpToNext: char ? Number(char.xpToNext) : undefined,
      gold: Number(playerLeague.gold),
      mapDrops: mapDrops.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        quality: d.quality,
        tier: d.tier,
        icon: d.icon,
        bossId: d.bossId,
        bossKeyTier: d.bossKeyTier,
      })),
      locationId: session.locationId || null,
      dailyBonusUsed: usedDailyBonus,
      dailyBonusRemaining,
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

  /**
   * Report player death — save audit record and clean up session.
   */
  async playerDeath(telegramId: string, sessionId: string) {
    const session = await this.redis.getJson<RedisCombatSession>(
      this.sessionKey(sessionId),
    );
    if (!session || session.playerId !== telegramId) {
      throw new NotFoundException('Combat session not found');
    }

    // Save audit record with 'died' status
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
      monstersKilled: session.currentIndex,
      totalGoldEarned: String(session.totalGoldEarned),
      totalXpEarned: String(session.totalXpEarned),
      totalTaps: session.totalTaps,
      completedAt: new Date(),
      status: 'died',
    });
    await this.sessionRepo.save(auditSession);

    await this.redis.del(this.sessionKey(sessionId));

    return { success: true };
  }
}
