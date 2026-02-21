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
import { Item } from '../shared/entities/item.entity';
import { EquipmentSlot } from '../shared/entities/equipment-slot.entity';
import { DojoRecord } from '../shared/entities/dojo-record.entity';
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
import type { DamageBreakdown, ElementalDamage, ElementalResistance } from '@shared/types';
import { ACTIVE_SKILLS, type ActiveSkillId } from '@shared/active-skills';
import {
  rollLoot,
  getLootPool,
  getFlaskDef,
  QUALITY_CHARGES,
  type LootEntry,
} from '@shared/potion-drops';

/** Cached character stats — loaded once at combat start, used from Redis for 0 DB hits. */
export interface CachedCharStats {
  tapDamage: number;
  critChance: number;
  critMultiplier: number;
  dodgeChance: number;
  specialValue: number;
  classId: string;
  elementalDamage: ElementalDamage;
  resistance: ElementalResistance;
  level: number;
  xp: string;
  xpToNext: string;
  maxHp: number;
  hp: number;
}

/** Cached potion data — stored in Redis session for 0 DB hits during combat. */
export interface CachedPotion {
  itemId: string;
  flaskType: string;
  quality: string;
  name: string;
  maxCharges: number;
  currentCharges: number;
  healPercent: number;
}

export interface RedisCombatSession {
  id: string;
  playerId: string;
  characterId: string;
  leagueId: string;
  playerLeagueId: string;
  mode: 'location' | 'map' | 'boss_map' | 'dojo';
  monsterQueue: ServerMonster[];
  currentIndex: number;
  totalGoldEarned: number;
  totalXpEarned: number;
  totalTaps: number;
  lastTapTime: number;
  startedAt: number;
  locationId?: string;
  /** Act number (1-5) for location mode — used for potion drop tables */
  locationAct?: number;
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
  /** Cached character stats — 0 DB hits in processTap/processEnemyTick */
  cachedStats: CachedCharStats;
  /** Equipped potions — 0 DB hits in usePotion */
  equippedPotions: {
    'consumable-1': CachedPotion | null;
    'consumable-2': CachedPotion | null;
  };
  /**
   * @deprecated Charges are no longer persisted to DB — they reset every combat.
   * Kept for Redis session shape compatibility during rolling deploys.
   */
  potionChargesChanged?: boolean;
  /** Active skill cooldown tracking: skillId → last cast timestamp (ms) */
  skillCooldowns?: Record<string, number>;
  /** Dojo-specific: server timestamp when fight ends */
  dojoEndsAt?: number;
  /** Dojo-specific: accumulated total damage */
  dojoTotalDamage?: number;
  /** Dojo-specific: number of taps */
  dojoTotalTaps?: number;
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
    @InjectRepository(Item)
    private itemRepo: Repository<Item>,
    @InjectRepository(EquipmentSlot)
    private equipSlotRepo: Repository<EquipmentSlot>,
    @InjectRepository(DojoRecord)
    private dojoRecordRepo: Repository<DojoRecord>,
  ) {}

  sessionKey(id: string) {
    return `combat:session:${id}`;
  }

  // ─── Anti-cheat helpers ───────────────────────────────────

  private msgWindowKey(telegramId: string, windowIndex: number): string {
    return `anticheat:msgs:${telegramId}:${windowIndex}`;
  }
  private banKey(telegramId: string): string {
    return `anticheat:ban:${telegramId}`;
  }

  /** Check if a player is currently banned. Fast path: Redis. Fallback: DB. */
  async isPlayerBanned(telegramId: string): Promise<{ banned: boolean; expiresAt?: number }> {
    const banData = await this.redis.getJson<{ reason: string; bannedAt: number; expiresAt: number }>(
      this.banKey(telegramId),
    );
    if (banData && banData.expiresAt > Date.now()) {
      return { banned: true, expiresAt: banData.expiresAt };
    }

    // Fallback: DB (Redis may have been flushed)
    const player = await this.playerRepo.findOne({ where: { telegramId } });
    if (player?.bannedUntil && player.bannedUntil.getTime() > Date.now()) {
      const remainingTtl = Math.ceil((player.bannedUntil.getTime() - Date.now()) / 1000);
      await this.redis.setJson(this.banKey(telegramId), {
        reason: player.banReason || 'rate_limit',
        bannedAt: Date.now(),
        expiresAt: player.bannedUntil.getTime(),
      }, remainingTtl);
      return { banned: true, expiresAt: player.bannedUntil.getTime() };
    }

    return { banned: false };
  }

  /**
   * Universal rate limiter — called for EVERY socket message.
   * >30 messages in any 3-second window = instant ban.
   * Returns true if the player was just banned.
   */
  async checkMessageRate(telegramId: string): Promise<boolean> {
    const windowIndex = Math.floor(Date.now() / B.ANTICHEAT_WINDOW_MS);
    const key = this.msgWindowKey(telegramId, windowIndex);

    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 10);
    }

    if (count <= B.ANTICHEAT_MSG_LIMIT) return false;

    await this.banPlayer(telegramId, 'rate_limit_exceeded');
    return true;
  }

  /** Ban a player for 1 day. */
  private async banPlayer(telegramId: string, reason: string): Promise<void> {
    const now = Date.now();
    const expiresAt = now + B.ANTICHEAT_BAN_DURATION_MS;
    const ttlSeconds = Math.ceil(B.ANTICHEAT_BAN_DURATION_MS / 1000);

    await this.redis.setJson(this.banKey(telegramId), {
      reason,
      bannedAt: now,
      expiresAt,
    }, ttlSeconds);

    await this.playerRepo.update(telegramId, {
      bannedUntil: new Date(expiresAt),
      banReason: reason,
    });

    console.warn(
      `[AntiCheat] BANNED player ${telegramId} for "${reason}" until ${new Date(expiresAt).toISOString()}`,
    );
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
   * Build CachedCharStats from a Character entity.
   */
  private buildCachedStats(char: Character): CachedCharStats {
    return {
      tapDamage: char.tapDamage,
      critChance: char.critChance,
      critMultiplier: char.critMultiplier,
      dodgeChance: char.dodgeChance,
      specialValue: char.specialValue,
      classId: char.classId,
      elementalDamage: char.elementalDamage || { physical: 1.0 },
      resistance: char.resistance || {},
      level: char.level,
      xp: char.xp,
      xpToNext: char.xpToNext,
      maxHp: char.maxHp,
      hp: char.hp,
    };
  }

  /**
   * Load equipped potions from equipment_slots for a character.
   */
  private async buildEquippedPotions(
    characterId: string,
  ): Promise<{ 'consumable-1': CachedPotion | null; 'consumable-2': CachedPotion | null }> {
    const result: { 'consumable-1': CachedPotion | null; 'consumable-2': CachedPotion | null } = {
      'consumable-1': null,
      'consumable-2': null,
    };

    const slots = await this.equipSlotRepo.find({
      where: { characterId },
      relations: ['item'],
    });

    for (const slot of slots) {
      if (
        (slot.slotId === 'consumable-1' || slot.slotId === 'consumable-2') &&
        slot.item &&
        slot.item.type === 'potion'
      ) {
        const maxCharges = slot.item.maxCharges!;
        // Potions always start combat fully charged (charges live in Redis only)
        result[slot.slotId] = {
          itemId: slot.item.id,
          flaskType: slot.item.flaskType!,
          quality: slot.item.quality,
          name: slot.item.name,
          maxCharges,
          currentCharges: maxCharges,
          healPercent: slot.item.healPercent!,
        };
      }
    }

    return result;
  }

  // Potion charges are NOT persisted to DB — they reset to max every combat.
  // Charge tracking lives only in the Redis session during active combat.

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

    // Cache stats + potions at combat start (only DB reads happen here)
    const cachedStats = this.buildCachedStats(char);
    const equippedPotions = await this.buildEquippedPotions(char.id);

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
      locationAct: actNumber,
      playerLevel: char.level,
      playerCurrentHp: char.maxHp,
      playerMaxHp: char.maxHp,
      lastEnemyAttackTime: now,
      nextAttackIn: this.getFirstAttackDelay(queue[0]),
      cachedStats,
      equippedPotions,
      potionChargesChanged: false, // deprecated — kept for Redis compat
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

    // Cache stats + potions at combat start
    const cachedStats = this.buildCachedStats(char);
    const equippedPotions = await this.buildEquippedPotions(char.id);

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
      cachedStats,
      equippedPotions,
      potionChargesChanged: false, // deprecated — kept for Redis compat
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
    const key = await this.itemRepo.findOne({
      where: { id: dto.mapKeyItemId, playerLeagueId: playerLeague.id, status: 'bag' },
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

    // Remove the key from bag (consumed)
    await this.itemRepo.remove(key);

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
    stats: CachedCharStats,
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
    const charResistance = stats.resistance || {};
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
      if (Math.random() < stats.dodgeChance) {
        attacks.push({ dodged: true, damage: 0, breakdown: null, attackName });
        // Next attack delay: attack speed (for next picked) — short for dodged
        session.nextAttackIn = chosenAttack
          ? Math.round((chosenAttack.pauseAfter + 0.3) * 1000)
          : B.ENEMY_ATTACK_INTERVAL_MS;
        continue;
      }

      // Warrior block check (class special: blockChance)
      const classDef = CLASS_DEFS[stats.classId];
      if (classDef?.special.id === 'blockChance' && Math.random() < stats.specialValue) {
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

    // Use cached stats from Redis — ZERO DB hit
    const { attacks, playerDead } = this.processEnemyAttacks(session, session.cachedStats, Date.now());

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

    // Use cached stats from Redis — ZERO DB read
    const stats = session.cachedStats;

    // Calculate raw damage (before elemental split)
    const isCrit = Math.random() < stats.critChance;
    let rawDamage = stats.tapDamage;
    if (isCrit) {
      rawDamage = Math.floor(rawDamage * stats.critMultiplier);
    }

    // Apply damage to current monster
    const monster = session.monsterQueue[session.currentIndex];
    if (!monster) {
      throw new BadRequestException('No monster to attack');
    }

    // Elemental damage: split by profile, reduce by resistance
    const damageProfile = stats.elementalDamage || { physical: 1.0 };
    const monsterResistance = monster.resistance || {};
    const breakdown = computeElementalDamage(rawDamage, damageProfile, monsterResistance);

    monster.currentHp -= breakdown.total;
    session.totalTaps++;
    session.lastTapTime = now;

    let killed = false;
    let xpGained = 0;
    let leveledUp = false;
    let charLevel = stats.level;
    let charXp = Number(stats.xp);
    let charXpToNext = Number(stats.xpToNext);

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

      // ── Award XP immediately (update cached stats in-place) ──
      const prevLevel = stats.level;
      stats.xp = String(BigInt(stats.xp) + BigInt(scaledXp));

      while (
        stats.level < MAX_LEVEL &&
        BigInt(stats.xp) >= BigInt(stats.xpToNext)
      ) {
        stats.xp = String(BigInt(stats.xp) - BigInt(stats.xpToNext));
        stats.level++;
        stats.xpToNext = String(
          Math.floor(B.XP_BASE * Math.pow(B.XP_GROWTH, stats.level - 1)),
        );

        // Apply class-based stat growth
        const newStatsForLevel = statsAtLevel(stats.classId, stats.level);
        stats.maxHp = newStatsForLevel.hp;
        stats.hp = newStatsForLevel.hp;
        stats.tapDamage = newStatsForLevel.tapDamage;
        stats.critChance = newStatsForLevel.critChance;
        stats.critMultiplier = newStatsForLevel.critMultiplier;
        stats.dodgeChance = newStatsForLevel.dodgeChance;
        stats.specialValue = specialAtLevel(stats.classId, stats.level);
      }

      // Clamp XP at max level
      if (stats.level >= MAX_LEVEL) {
        stats.xp = '0';
      }

      leveledUp = stats.level > prevLevel;
      charLevel = stats.level;
      charXp = Number(stats.xp);
      charXpToNext = Number(stats.xpToNext);

      // Update session's playerLevel so XP-scaling stays current
      session.playerLevel = stats.level;

      // Also update playerMaxHp if leveled up (for heal calculations)
      if (leveledUp) {
        session.playerMaxHp = stats.maxHp;
      }

      // Persist XP/level to DB (only DB write in hot path)
      if (leveledUp) {
        await this.charRepo.update(session.characterId, {
          level: stats.level,
          xp: stats.xp,
          xpToNext: stats.xpToNext,
          maxHp: stats.maxHp,
          hp: stats.hp,
          tapDamage: stats.tapDamage,
          critChance: stats.critChance,
          critMultiplier: stats.critMultiplier,
          dodgeChance: stats.dodgeChance,
          specialValue: stats.specialValue,
        });
      } else {
        await this.charRepo.update(session.characterId, {
          xp: stats.xp,
          level: stats.level,
          xpToNext: stats.xpToNext,
        });
      }

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

    // Award gold to PlayerLeague — atomic increment (no load+save)
    await this.playerLeagueRepo
      .createQueryBuilder()
      .update(PlayerLeague)
      .set({
        gold: () => `"gold"::bigint + ${session.totalGoldEarned}`,
      })
      .where('id = :id', { id: session.playerLeagueId })
      .execute();

    // Update global lifetime meta stats — atomic increment (no load+save)
    await this.playerRepo
      .createQueryBuilder()
      .update(Player)
      .set({
        totalGold: () => `"totalGold"::bigint + ${session.totalGoldEarned}`,
        totalKills: () => `"totalKills"::bigint + ${session.monsterQueue.length}`,
        totalTaps: () => `"totalTaps"::bigint + ${session.totalTaps}`,
        lastSaveTime: String(Date.now()),
      })
      .where('"telegramId" = :telegramId', { telegramId })
      .execute();

    // Read current gold for response
    const playerLeague = await this.playerLeagueRepo.findOne({
      where: { id: session.playerLeagueId },
      select: ['id', 'gold'],
    });

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
    let mapDrops: Partial<Item>[] = [];
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

    // Roll loot drops (3 independent rolls, ALL combat modes)
    let lootDrops: Partial<Item>[] = [];
    {
      const actOrTier = session.mode === 'location'
        ? (session.locationAct || 1)
        : (session.mapTier || 1);
      const pool = getLootPool(session.mode as 'location' | 'map' | 'boss_map', actOrTier);
      const wonEntries = rollLoot(pool);

      for (const entry of wonEntries) {
        if (entry.result.type === 'potion') {
          const flask = getFlaskDef(entry.result.flaskType);
          const maxCharges = QUALITY_CHARGES[entry.result.quality] ?? 2;
          lootDrops.push({
            id: `potion_${entry.result.flaskType}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: flask.name,
            type: 'potion',
            quality: entry.result.quality,
            flaskType: entry.result.flaskType,
            maxCharges,
            currentCharges: maxCharges,
            healPercent: flask.healPercent,
            icon: 'potion',
            acquiredAt: String(Date.now()),
          });
        }
      }

      if (lootDrops.length > 0) {
        await this.lootService.addItemsToBag(
          session.playerLeagueId,
          lootDrops,
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
      level: char ? char.level : session.cachedStats.level,
      xp: char ? Number(char.xp) : Number(session.cachedStats.xp),
      xpToNext: char ? Number(char.xpToNext) : Number(session.cachedStats.xpToNext),
      gold: Number(playerLeague?.gold ?? 0),
      mapDrops: [...mapDrops, ...lootDrops].map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        quality: d.quality,
        tier: d.tier,
        icon: d.icon,
        bossId: d.bossId,
        bossKeyTier: d.bossKeyTier,
        flaskType: d.flaskType,
        maxCharges: d.maxCharges,
        currentCharges: d.currentCharges,
        healPercent: d.healPercent,
      })),
      locationId: session.locationId || null,
      dailyBonusRemaining,
    };
  }

  /**
   * Flee from combat (abandon session, no rewards).
   * Potion charges consumed during the run are still spent.
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

  // ─── Dojo (server-authoritative training dummy) ──────────

  /**
   * Start a dojo training session — minimal setup, no monsters or enemy attacks.
   */
  async startDojo(telegramId: string): Promise<{
    sessionId: string;
    dojoEndsAt: number;
  }> {
    const { playerLeague } = await this.getActiveCharacterInfo(telegramId);

    const char = await this.charRepo.findOne({
      where: { id: playerLeague.activeCharacterId! },
    });
    if (!char) throw new NotFoundException('Character not found');

    const cachedStats = this.buildCachedStats(char);
    const now = Date.now();
    const dojoEndsAt = now + B.DOJO_COUNTDOWN_MS + B.DOJO_ROUND_MS;
    const sessionId = uuidv4();

    const session: RedisCombatSession = {
      id: sessionId,
      playerId: telegramId,
      characterId: playerLeague.activeCharacterId!,
      leagueId: playerLeague.leagueId,
      playerLeagueId: playerLeague.id,
      mode: 'dojo',
      monsterQueue: [],
      currentIndex: 0,
      totalGoldEarned: 0,
      totalXpEarned: 0,
      totalTaps: 0,
      lastTapTime: 0,
      startedAt: now,
      playerLevel: char.level,
      playerCurrentHp: char.maxHp,
      playerMaxHp: char.maxHp,
      lastEnemyAttackTime: now,
      nextAttackIn: 0,
      cachedStats,
      equippedPotions: { 'consumable-1': null, 'consumable-2': null },
      dojoEndsAt,
      dojoTotalDamage: 0,
      dojoTotalTaps: 0,
    };

    await this.redis.setJson(this.sessionKey(sessionId), session, B.DOJO_SESSION_TTL);

    return { sessionId, dojoEndsAt };
  }

  /**
   * Process a tap in dojo mode — server-authoritative damage, no monster HP.
   */
  async processDojoTap(telegramId: string, sessionId: string) {
    const session = await this.redis.getJson<RedisCombatSession>(
      this.sessionKey(sessionId),
    );
    if (!session || session.playerId !== telegramId || session.mode !== 'dojo') {
      throw new NotFoundException('Dojo session not found');
    }

    const now = Date.now();

    // Check if time is up
    if (now >= session.dojoEndsAt!) {
      return {
        damage: 0,
        damageBreakdown: null,
        isCrit: false,
        totalDamage: session.dojoTotalDamage!,
        totalTaps: session.dojoTotalTaps!,
        dojoEnded: true,
        timeLeftMs: 0,
      };
    }

    // Rate limit: min 50ms between taps
    if (now - session.lastTapTime < MIN_TAP_INTERVAL_MS) {
      throw new BadRequestException('Tap too fast');
    }

    const stats = session.cachedStats;
    const isCrit = Math.random() < stats.critChance;
    let rawDamage = stats.tapDamage;
    if (isCrit) {
      rawDamage = Math.floor(rawDamage * stats.critMultiplier);
    }

    // Elemental damage vs zero resistance (training dummy)
    const damageProfile = stats.elementalDamage || { physical: 1.0 };
    const breakdown = computeElementalDamage(rawDamage, damageProfile, {});

    session.dojoTotalDamage! += breakdown.total;
    session.dojoTotalTaps! += 1;
    session.lastTapTime = now;

    const timeLeftMs = Math.max(0, session.dojoEndsAt! - now);

    await this.redis.setJson(this.sessionKey(sessionId), session, B.DOJO_SESSION_TTL);

    return {
      damage: breakdown.total,
      damageBreakdown: breakdown,
      isCrit,
      totalDamage: session.dojoTotalDamage!,
      totalTaps: session.dojoTotalTaps!,
      dojoEnded: false,
      timeLeftMs,
    };
  }

  /**
   * Complete a dojo session — persist best score, clean up.
   */
  async completeDojo(telegramId: string, sessionId: string) {
    const session = await this.redis.getJson<RedisCombatSession>(
      this.sessionKey(sessionId),
    );
    if (!session || session.playerId !== telegramId || session.mode !== 'dojo') {
      throw new NotFoundException('Dojo session not found');
    }

    const totalDamage = session.dojoTotalDamage || 0;
    const totalTaps = session.dojoTotalTaps || 0;
    const dps = totalDamage > 0 ? Math.round(totalDamage / (B.DOJO_ROUND_MS / 1000)) : 0;

    const char = await this.charRepo.findOne({
      where: { id: session.characterId },
      relations: ['player'],
    });

    let bestDamage = totalDamage;
    let isNewBest = false;

    if (char) {
      if (totalDamage > char.dojoBestDamage) {
        char.dojoBestDamage = totalDamage;
        isNewBest = true;
        await this.charRepo.save(char);
      }
      bestDamage = char.dojoBestDamage;

      await this.upsertDojoRecord(char, totalDamage);
    }

    await this.redis.del(this.sessionKey(sessionId));

    return { totalDamage, totalTaps, dps, bestDamage, isNewBest };
  }

  /**
   * Upsert dojo leaderboard record (denormalized table).
   * Single PostgreSQL INSERT ON CONFLICT with GREATEST — replaces SELECT + INSERT/UPDATE.
   */
  private async upsertDojoRecord(char: Character, totalDamage: number): Promise<void> {
    const tgUsername = char.player?.telegramUsername || null;

    await this.dojoRecordRepo.query(
      `INSERT INTO dojo_records
        ("characterId", "playerTelegramId", "leagueId", "telegramUsername",
         "nickname", "classId", "skinId", "level", "bestDamage")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT ("characterId") DO UPDATE SET
         "telegramUsername" = EXCLUDED."telegramUsername",
         "leagueId" = EXCLUDED."leagueId",
         "nickname" = EXCLUDED."nickname",
         "classId" = EXCLUDED."classId",
         "skinId" = EXCLUDED."skinId",
         "level" = EXCLUDED."level",
         "bestDamage" = GREATEST(dojo_records."bestDamage", EXCLUDED."bestDamage"),
         "updatedAt" = NOW()`,
      [
        char.id,
        char.playerTelegramId,
        char.leagueId,
        tgUsername,
        char.nickname,
        char.classId,
        char.skinId,
        char.level,
        totalDamage,
      ],
    );
  }

  // ─── Potion usage ──────────────────────────────────────

  /**
   * Use a potion from an equipment consumable slot during combat.
   * Redis-only — ZERO DB hits. Charges persisted at combat end.
   */
  async usePotion(
    telegramId: string,
    sessionId: string,
    slot: 'consumable-1' | 'consumable-2',
  ) {
    const session = await this.redis.getJson<RedisCombatSession>(
      this.sessionKey(sessionId),
    );
    if (!session || session.playerId !== telegramId) {
      throw new NotFoundException('Combat session not found');
    }
    if (session.playerCurrentHp <= 0) {
      throw new BadRequestException('Player is dead');
    }

    // Read from cached potion data — ZERO DB hit
    const potionData = session.equippedPotions[slot];
    if (!potionData || !potionData.flaskType) {
      throw new BadRequestException('No potion in that slot');
    }
    if (potionData.currentCharges <= 0) {
      throw new BadRequestException('No charges remaining');
    }

    // Calculate heal
    const healAmount = Math.floor(session.playerMaxHp * potionData.healPercent);
    const oldHp = session.playerCurrentHp;
    session.playerCurrentHp = Math.min(
      session.playerMaxHp,
      session.playerCurrentHp + healAmount,
    );
    const actualHeal = session.playerCurrentHp - oldHp;

    // Decrement charges in Redis only (never persisted to DB)
    potionData.currentCharges--;

    // Persist to Redis — ZERO DB write
    await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);

    return {
      slot,
      healAmount: actualHeal,
      playerHp: session.playerCurrentHp,
      playerMaxHp: session.playerMaxHp,
      remainingCharges: potionData.currentCharges,
      maxCharges: potionData.maxCharges,
    };
  }

  // ─── Active skill casting ──────────────────────────────

  /**
   * Cast an active skill — server-authoritative with cooldown validation.
   * Damage = tapDamage × skill.damageMultiplier, using the skill's elemental profile.
   */
  async castSkill(telegramId: string, sessionId: string, skillId: string) {
    const skillDef = ACTIVE_SKILLS[skillId as ActiveSkillId];
    if (!skillDef) {
      throw new BadRequestException(`Unknown skill: ${skillId}`);
    }

    const session = await this.redis.getJson<RedisCombatSession>(
      this.sessionKey(sessionId),
    );
    if (!session || session.playerId !== telegramId) {
      throw new NotFoundException('Combat session not found');
    }

    // Player dead — reject
    if (session.playerCurrentHp <= 0) {
      throw new BadRequestException('Player is dead');
    }

    // Cooldown check (server-authoritative anti-cheat)
    const now = Date.now();
    if (!session.skillCooldowns) session.skillCooldowns = {};
    const lastCast = session.skillCooldowns[skillId] || 0;
    if (now - lastCast < skillDef.cooldownMs) {
      throw new BadRequestException('Skill on cooldown');
    }

    const stats = session.cachedStats;
    const monster = session.monsterQueue[session.currentIndex];
    if (!monster) {
      throw new BadRequestException('No monster to attack');
    }

    // Crit roll (uses same crit stats as tap)
    const isCrit = Math.random() < stats.critChance;
    let rawDamage = Math.floor(stats.tapDamage * skillDef.damageMultiplier);
    if (isCrit) {
      rawDamage = Math.floor(rawDamage * stats.critMultiplier);
    }

    // Elemental damage using skill's profile vs monster resistance
    const monsterResistance = monster.resistance || {};
    const breakdown = computeElementalDamage(rawDamage, skillDef.elementalProfile, monsterResistance);

    monster.currentHp -= breakdown.total;
    session.skillCooldowns[skillId] = now;

    let killed = false;
    let xpGained = 0;
    let leveledUp = false;
    let charLevel = stats.level;
    let charXp = Number(stats.xp);
    let charXpToNext = Number(stats.xpToNext);

    if (monster.currentHp <= 0) {
      monster.currentHp = 0;
      killed = true;
      session.totalGoldEarned += monster.goldReward;

      // XP level-scaling (same as processTap)
      const D = Math.abs(session.playerLevel - (monster.level || session.playerLevel));
      const scaledXp = Math.max(1, Math.floor(
        monster.xpReward / (1 + B.XP_LEVEL_SCALING_A * D * D),
      ));
      session.totalXpEarned += scaledXp;
      xpGained = scaledXp;

      // Award XP immediately (same logic as processTap)
      const prevLevel = stats.level;
      stats.xp = String(BigInt(stats.xp) + BigInt(scaledXp));

      while (
        stats.level < MAX_LEVEL &&
        BigInt(stats.xp) >= BigInt(stats.xpToNext)
      ) {
        stats.xp = String(BigInt(stats.xp) - BigInt(stats.xpToNext));
        stats.level++;
        stats.xpToNext = String(
          Math.floor(B.XP_BASE * Math.pow(B.XP_GROWTH, stats.level - 1)),
        );

        const newStatsForLevel = statsAtLevel(stats.classId, stats.level);
        stats.maxHp = newStatsForLevel.hp;
        stats.hp = newStatsForLevel.hp;
        stats.tapDamage = newStatsForLevel.tapDamage;
        stats.critChance = newStatsForLevel.critChance;
        stats.critMultiplier = newStatsForLevel.critMultiplier;
        stats.dodgeChance = newStatsForLevel.dodgeChance;
        stats.specialValue = specialAtLevel(stats.classId, stats.level);
      }

      if (stats.level >= MAX_LEVEL) {
        stats.xp = '0';
      }

      leveledUp = stats.level > prevLevel;
      charLevel = stats.level;
      charXp = Number(stats.xp);
      charXpToNext = Number(stats.xpToNext);

      session.playerLevel = stats.level;
      if (leveledUp) {
        session.playerMaxHp = stats.maxHp;
      }

      // Persist XP/level to DB
      if (leveledUp) {
        await this.charRepo.update(session.characterId, {
          level: stats.level,
          xp: stats.xp,
          xpToNext: stats.xpToNext,
          maxHp: stats.maxHp,
          hp: stats.hp,
          tapDamage: stats.tapDamage,
          critChance: stats.critChance,
          critMultiplier: stats.critMultiplier,
          dodgeChance: stats.dodgeChance,
          specialValue: stats.specialValue,
        });
      } else {
        await this.charRepo.update(session.characterId, {
          xp: stats.xp,
          level: stats.level,
          xpToNext: stats.xpToNext,
        });
      }

      session.currentIndex++;
      session.lastEnemyAttackTime = now;
      const nextMonster = session.monsterQueue[session.currentIndex];
      session.nextAttackIn = this.getFirstAttackDelay(nextMonster);
    }

    const isComplete = session.currentIndex >= session.monsterQueue.length;
    await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);

    return {
      skillId,
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
      xpGained,
      leveledUp,
      level: charLevel,
      xp: charXp,
      xpToNext: charXpToNext,
      cooldownUntil: now + skillDef.cooldownMs,
    };
  }
}
