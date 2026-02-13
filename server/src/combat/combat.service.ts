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
import { pickRandomAttack } from '@shared/monster-attacks';
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
  /** Player level at session start — for XP level-scaling */
  playerLevel: number;
  // Enemy attack system
  playerCurrentHp: number;
  playerMaxHp: number;
  lastEnemyAttackTime: number;
  /** Time (ms) until next enemy attack — per-attack speed system */
  nextAttackIn: number;
}

export interface EnemyAttackResult {
  dodged: boolean;
  blocked?: boolean;
  damage: number;
  breakdown: DamageBreakdown | null;
  /** Name of the attack used (for combat log) */
  attackName?: string;
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
   * Validate that the character has access to the given location.
   * Requirement pattern mirrors the client-side locations.ts logic:
   *   - Orders 1-8: linear chain (order N requires order N-1 from same act)
   *   - Order 9 requires order 3, order 10 requires order 5
   *   - Act N requires act N-1 main chain (orders 1-8) to be complete
   * Location IDs follow the pattern: act{N}_{snake_case_name}
   */
  private validateLocationAccess(
    char: Character,
    locationId: string,
    locationOrder: number,
    actNumber: number,
  ): void {
    const completed = char.completedLocations || [];

    // Act 1, order 1 is always accessible
    if (actNumber === 1 && locationOrder === 1) return;

    // Already completed locations can always be replayed
    if (completed.includes(locationId)) return;

    // For act > 1, verify previous act's main chain (orders 1-8) is complete
    if (actNumber > 1) {
      const prevActPrefix = `act${actNumber - 1}_`;
      const prevActMainCompleted = completed.filter(
        (id) => id.startsWith(prevActPrefix),
      );
      // Need at least 8 main-chain completions from previous act
      // (This is a soft check — exact IDs depend on location names,
      //  but having ≥8 completed from previous act is a good proxy)
      if (prevActMainCompleted.length < 8) {
        throw new BadRequestException(
          `Previous act (${actNumber - 1}) must be completed first`,
        );
      }
    }

    // Within the same act, check prerequisite order
    // Requirement pattern: [0, 1, 2, 3, 4, 5, 6, 7, 3, 5]
    const REQUIREMENT_ORDER: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 3, 5];
    const reqOrder = REQUIREMENT_ORDER[locationOrder - 1] ?? 0;
    if (reqOrder > 0) {
      // The required location is in the same act, at the given order.
      // We check if ANY location from this act with the required order is completed.
      // Since location IDs are act-prefixed, we look through completedLocations.
      const sameActPrefix = `act${actNumber}_`;
      const sameActCompleted = completed.filter((id) =>
        id.startsWith(sameActPrefix),
      );

      // We can't know exact ID without location catalog, but we can
      // use the gateway data: client sends locationId, order, act.
      // Better approach: count how many locations from this act are completed.
      // If order-1 locations should be completed, check >= reqOrder completed.
      // This works because locations are completed in sequence.
      if (sameActCompleted.length < reqOrder) {
        throw new BadRequestException(
          `Must complete previous location (order ${reqOrder}) first`,
        );
      }
    }
  }

  /**
   * Start a location combat session.
   * Validates that the player has completed prerequisite locations.
   */
  async startLocation(telegramId: string, locationId: string, waves: any[], locationOrder: number, actNumber: number) {
    const { playerLeague } = await this.getActiveCharacterInfo(telegramId);

    const char = await this.charRepo.findOne({
      where: { id: playerLeague.activeCharacterId! },
    });
    if (!char) throw new NotFoundException('Character not found');

    // Validate location prerequisites
    this.validateLocationAccess(char, locationId, locationOrder, actNumber);

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
      playerLevel: char.level,
      playerCurrentHp: char.maxHp,
      playerMaxHp: char.maxHp,
      lastEnemyAttackTime: now,
      nextAttackIn: this.getFirstAttackDelay(queue[0]),
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
      mapTier,
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
      playerLevel: char.level,
      playerCurrentHp: char.maxHp,
      playerMaxHp: char.maxHp,
      lastEnemyAttackTime: now,
      nextAttackIn: this.getFirstAttackDelay(queue[0]),
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
   * Get initial attack delay for a monster (seconds → ms).
   */
  private getFirstAttackDelay(monster: ServerMonster | undefined): number {
    if (!monster?.attacks?.length) return B.ENEMY_ATTACK_INTERVAL_MS;
    // Average of the attack pool speeds, converted to ms
    const avg = monster.attacks.reduce((s, a) => s + a.speed, 0) / monster.attacks.length;
    return Math.round(avg * 1000);
  }

  /**
   * Calculate and apply accumulated enemy attacks since lastEnemyAttackTime.
   * Uses per-attack speed and pause system when monster has attack pool.
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

    // Per-attack system: use nextAttackIn (ms) to determine when attack fires
    const hasAttackPool = monster.attacks && monster.attacks.length > 0;
    let timeBank = elapsed; // ms available to spend on attacks
    const attacks: EnemyAttackResult[] = [];
    const charResistance = char.resistance || {};
    let attackCount = 0;

    // Safety: ensure nextAttackIn is a valid positive number (guards against
    // NaN, undefined, 0 from old Redis sessions or bad data)
    if (!session.nextAttackIn || session.nextAttackIn <= 0 || isNaN(session.nextAttackIn)) {
      session.nextAttackIn = this.getFirstAttackDelay(monster);
    }

    while (timeBank >= session.nextAttackIn && attackCount < B.MAX_PENDING_ATTACKS) {
      if (session.playerCurrentHp <= 0) break;

      timeBank -= session.nextAttackIn;
      attackCount++;

      // Pick an attack from the pool (or use legacy fallback)
      const chosenAttack = hasAttackPool ? pickRandomAttack(monster.attacks!) : null;
      const dmgProfile = chosenAttack ? chosenAttack.damage : (monster.outgoingDamage || { physical: 1.0 });
      const dmgMul = chosenAttack ? chosenAttack.damageMul : 1.0;
      const attackName = chosenAttack ? chosenAttack.name : undefined;

      // Dodge check
      if (Math.random() < char.dodgeChance) {
        attacks.push({ dodged: true, damage: 0, breakdown: null, attackName });
        // Next attack delay: attack speed (for next picked) — short for dodged
        session.nextAttackIn = chosenAttack
          ? Math.round((chosenAttack.pauseAfter + 0.3) * 1000)
          : B.ENEMY_ATTACK_INTERVAL_MS;
        continue;
      }

      // Warrior block check (class special: blockChance)
      const classDef = CLASS_DEFS[char.classId];
      if (classDef?.special.id === 'blockChance' && Math.random() < char.specialValue) {
        attacks.push({ dodged: false, blocked: true, damage: 0, breakdown: null, attackName });
        session.nextAttackIn = chosenAttack
          ? Math.round((chosenAttack.pauseAfter + 0.3) * 1000)
          : B.ENEMY_ATTACK_INTERVAL_MS;
        continue;
      }

      // Compute elemental damage: attack profile + multiplier vs player's resistance
      const rawDamage = Math.floor(monster.scaledDamage * dmgMul);
      const breakdown = computeElementalDamage(rawDamage, dmgProfile, charResistance);

      session.playerCurrentHp -= breakdown.total;
      if (session.playerCurrentHp < 0) session.playerCurrentHp = 0;

      attacks.push({
        dodged: false,
        damage: breakdown.total,
        breakdown,
        attackName,
      });

      // Set next attack delay: pauseAfter + next attack's speed
      if (chosenAttack) {
        const nextAtk = pickRandomAttack(monster.attacks!);
        session.nextAttackIn = Math.round((chosenAttack.pauseAfter + nextAtk.speed) * 1000);
      } else {
        session.nextAttackIn = B.ENEMY_ATTACK_INTERVAL_MS;
      }
    }

    // Advance lastEnemyAttackTime by consumed time
    session.lastEnemyAttackTime = now - timeBank;

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
    let xpGained = 0;
    let leveledUp = false;
    let charLevel = char.level;
    let charXp = Number(char.xp);
    let charXpToNext = Number(char.xpToNext);

    if (monster.currentHp <= 0) {
      monster.currentHp = 0;
      killed = true;
      session.totalGoldEarned += monster.goldReward;

      // XP level-scaling: XP = BaseXP / (1 + a * D²)
      const D = Math.abs(session.playerLevel - (monster.level || session.playerLevel));
      const scaledXp = Math.max(1, Math.floor(
        monster.xpReward / (1 + B.XP_LEVEL_SCALING_A * D * D),
      ));
      session.totalXpEarned += scaledXp;
      xpGained = scaledXp;

      // ── Award XP immediately to Character (per-kill) ──
      const prevLevel = char.level;
      char.xp = String(BigInt(char.xp) + BigInt(scaledXp));

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

      leveledUp = char.level > prevLevel;
      charLevel = char.level;
      charXp = Number(char.xp);
      charXpToNext = Number(char.xpToNext);

      // Update session's playerLevel so XP-scaling stays current
      session.playerLevel = char.level;

      // Persist character XP/level to DB immediately
      await this.charRepo.save(char);

      session.currentIndex++;
      // Reset enemy attack timer for new monster
      session.lastEnemyAttackTime = now;
      const nextMonster = session.monsterQueue[session.currentIndex];
      session.nextAttackIn = this.getFirstAttackDelay(nextMonster);
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
      // Per-kill XP fields
      xpGained,
      leveledUp,
      level: charLevel,
      xp: charXp,
      xpToNext: charXpToNext,
    };
  }

  /**
   * Complete a combat session and award rewards.
   * Gold → PlayerLeague (XP already awarded per-kill in processTap).
   * Meta stats → Player, location/endgame progress → Character.
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

    // XP already awarded per-kill in processTap() — just read current char state
    // and persist location/endgame progress
    const char = await this.charRepo.findOne({
      where: { id: session.characterId },
    });
    let dailyBonusRemaining = DAILY_BONUS_WINS_MAX;

    if (char) {
      // Update daily bonus counter
      const today = getUtcDateString();
      if (char.dailyBonusResetDate !== today) {
        char.dailyBonusWinsUsed = 0;
        char.dailyBonusResetDate = today;
      }
      dailyBonusRemaining = Math.max(0, DAILY_BONUS_WINS_MAX - char.dailyBonusWinsUsed);

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
      totalXp: session.totalXpEarned,
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
