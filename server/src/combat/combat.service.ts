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
import {
  ACTIVE_SKILLS,
  type ActiveSkillId,
  getSkillScalingType,
  computeEffectiveSkillLevel,
  computeSkillLevelGrowth,
} from '@shared/active-skills';
import {
  rollLoot,
  getLootPool,
  getFlaskDef,
  QUALITY_CHARGES,
  type LootEntry,
} from '@shared/potion-drops';
import { rollEquipment, SUBTYPES, type EquipmentSlotId } from '@shared/equipment-defs';
import { pickRandomIcon } from '@shared/equipment-icons';
import {
  aggregateEquipmentStats,
  applyBonuses,
  emptyBonuses,
  type EquipmentBonuses,
} from '@shared/equipment-bonus';
import { buildSkillTree } from '@shared/skill-tree';
import { computeAllocatedBonuses } from '@shared/skill-node-defs';
import { getActModifierEffects } from '@shared/act-modifiers';

/** Cached character stats - loaded once at combat start, used from Redis for 0 DB hits. */
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
  /** Equipment bonuses - stored for re-application after level-up */
  equipBonuses: EquipmentBonuses;
  /** Extra flat elemental damage from gear */
  gearFireDmg: number;
  gearColdDmg: number;
  gearLightningDmg: number;
  /** Utility stats from equipment */
  goldFind: number;
  xpBonus: number;
  lifeOnHit: number;
  lifeRegen: number;
  armor: number;
  blockChance: number;
  passiveDpsBonus: number;
  /** Bonus skill levels from equipment — 3 types */
  weaponSpellLevel: number;
  arcaneSpellLevel: number;
  versatileSpellLevel: number;
  /** Equipped weapon subtypes (e.g. ['oh_sword', 'oh_dagger'] for dual-wield) */
  weaponSubtypes: string[];
  /** Weapon-only equipment bonuses — stored for amp multiplier application */
  weaponBonuses: EquipmentBonuses;
  /** Flat tap-only damage bonus from skill tree (doesn't affect skills) */
  tapHitBonus: number;
  /** Skill tree allocated bonuses - stored for re-application after level-up */
  treeBonuses: { percent: Record<string, number>; flat: Record<string, number> };
}

/** Cached potion data - stored in Redis session for 0 DB hits during combat. */
export interface CachedPotion {
  itemId: string;
  flaskType: string;
  quality: string;
  name: string;
  maxCharges: number;
  currentCharges: number;
  healPercent: number;
}

export interface ActiveEffect {
  instanceId: string;
  effectId: string;
  sourceSkillId: string;
  target: 'self' | 'enemy';
  stat: string;
  value: number;
  expiresAt: number;
  /** For enemy debuffs - tied to specific monster index */
  monsterIndex?: number;
  refreshable: boolean;
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
  /** Act number (1-5) for location mode - used for potion drop tables */
  locationAct?: number;
  mapTier?: number;
  bossId?: string;
  direction?: string;
  /** Player level at session start - for XP level-scaling */
  playerLevel: number;
  // Enemy attack system
  playerCurrentHp: number;
  playerMaxHp: number;
  lastEnemyAttackTime: number;
  /** Time (ms) until next enemy attack - per-attack speed system */
  nextAttackIn: number;
  /** Cached character stats - 0 DB hits in processTap/processEnemyTick */
  cachedStats: CachedCharStats;
  /** Equipped potions - 0 DB hits in usePotion */
  equippedPotions: {
    'consumable-1': CachedPotion | null;
    'consumable-2': CachedPotion | null;
  };
  /**
   * @deprecated Charges are no longer persisted to DB - they reset every combat.
   * Kept for Redis session shape compatibility during rolling deploys.
   */
  potionChargesChanged?: boolean;
  /** Active skill cooldown tracking: skillId → last cast timestamp (ms) */
  skillCooldowns?: Record<string, number>;
  /** Equipped skill IDs (loaded from DB at combat start) */
  equippedSkillIds?: string[];
  /** Active buff/debuff effects */
  activeEffects?: ActiveEffect[];
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
   * Universal rate limiter - called for EVERY socket message.
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
      // (This is a soft check - exact IDs depend on location names,
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
   * Build CachedCharStats from a Character entity + equipment bonuses + skill tree bonuses.
   */
  private buildCachedStats(char: Character, bonuses: EquipmentBonuses, weaponSubtypes: string[] = [], weaponBonuses?: EquipmentBonuses): CachedCharStats {
    const base = {
      tapDamage: char.tapDamage,
      maxHp: char.maxHp,
      hp: char.hp,
      critChance: char.critChance,
      critMultiplier: char.critMultiplier,
      dodgeChance: char.dodgeChance,
      specialValue: char.specialValue,
      resistance: char.resistance || {},
      elementalDamage: char.elementalDamage || { physical: 1.0 },
    };

    const eff = applyBonuses(base, bonuses);

    // Compute skill tree bonuses from allocated nodes
    const tree = buildSkillTree();
    const allocSet = new Set(char.allocatedNodes || []);
    const treeBonuses = computeAllocatedBonuses(tree.nodes, allocSet);

    const cached: CachedCharStats = {
      tapDamage: eff.tapDamage,
      critChance: eff.critChance,
      critMultiplier: eff.critMultiplier,
      dodgeChance: eff.dodgeChance,
      specialValue: eff.specialValue,
      classId: char.classId,
      elementalDamage: eff.elementalDamage as ElementalDamage,
      resistance: eff.resistance as ElementalResistance,
      level: char.level,
      xp: char.xp,
      xpToNext: char.xpToNext,
      maxHp: eff.maxHp,
      hp: eff.hp,
      // Store bonuses for re-application after level-up
      equipBonuses: bonuses,
      treeBonuses,
      // Gear elemental damage
      gearFireDmg: eff.gearFireDmg,
      gearColdDmg: eff.gearColdDmg,
      gearLightningDmg: eff.gearLightningDmg,
      // Utility stats
      goldFind: eff.goldFind,
      xpBonus: eff.xpBonus,
      lifeOnHit: eff.lifeOnHit,
      lifeRegen: eff.lifeRegen,
      armor: eff.armor,
      blockChance: eff.blockChance,
      passiveDpsBonus: eff.passiveDpsBonus,
      weaponSpellLevel: eff.weaponSpellLevel,
      arcaneSpellLevel: eff.arcaneSpellLevel,
      versatileSpellLevel: eff.versatileSpellLevel,
      weaponSubtypes,
      weaponBonuses: weaponBonuses || emptyBonuses(),
      tapHitBonus: 0,
    };

    // Apply skill tree percent bonuses on top of equipment-modified stats
    this.applyTreeBonuses(cached);

    return cached;
  }

  /**
   * Apply skill tree percent/flat bonuses on top of equipment-modified stats.
   *
   * All percentages scale BASE stats (level-only, no equipment) - additive stacking.
   * Additive for:        critChance, critMultiplier, dodgeChance
   * Elemental % bonus:   adds flat elemental damage = floor(baseDamage × bonus)
   */
  private applyTreeBonuses(stats: CachedCharStats): void {
    if (!stats.treeBonuses) return;
    const pct = stats.treeBonuses.percent;

    // Base stats from class+level only (no equipment)
    const base = statsAtLevel(stats.classId, stats.level);

    // Additive: tree % scales base stat, all bonuses sum (not multiply)
    stats.tapDamage += Math.floor(base.tapDamage * (pct.tapDamage || 0));

    const oldMaxHp = stats.maxHp;
    stats.maxHp += Math.floor(base.hp * (pct.hp || 0));
    // Scale current HP proportionally
    if (stats.maxHp > oldMaxHp && oldMaxHp > 0) {
      stats.hp = Math.floor(stats.hp * stats.maxHp / oldMaxHp);
    }
    stats.hp = Math.min(stats.hp, stats.maxHp);

    // Additive: crit, dodge (values are already in 0..1 range, e.g. 0.05 = +5%)
    stats.critChance += (pct.critChance || 0);
    stats.critMultiplier += (pct.critMultiplier || 0);
    stats.dodgeChance += (pct.dodgeChance || 0);

    // Armor % bonus: scales base armor
    if (pct.armor) {
      stats.armor += Math.floor((stats.armor || 0) * pct.armor);
    }

    // Elemental % bonuses: add as flat elemental damage based on BASE damage
    stats.gearFireDmg += Math.floor(base.tapDamage * (pct.fireDmg || 0));
    stats.gearColdDmg += Math.floor(base.tapDamage * (pct.coldDmg || 0));
    stats.gearLightningDmg += Math.floor(base.tapDamage * (pct.lightningDmg || 0));

    // ── Unique passive mechanics (from flat bonuses) ──────────
    const flat = stats.treeBonuses.flat || {};

    // Flat tap hit bonus from tree (tap-only, doesn't affect skill damage)
    stats.tapHitBonus = Math.floor(flat.tapHit || 0);

    // Elemental conversions: fire=lightning, cold=fire, lightning=cold
    if (flat.fireFromLightning) {
      stats.gearFireDmg = Math.max(stats.gearFireDmg, stats.gearLightningDmg);
    }
    if (flat.coldFromFire) {
      stats.gearColdDmg = Math.max(stats.gearColdDmg, stats.gearFireDmg);
    }
    if (flat.lightningFromCold) {
      stats.gearLightningDmg = Math.max(stats.gearLightningDmg, stats.gearColdDmg);
    }
    // All elemental = highest element
    if (flat.allElemental) {
      const highest = Math.max(stats.gearFireDmg, stats.gearColdDmg, stats.gearLightningDmg);
      stats.gearFireDmg = highest;
      stats.gearColdDmg = highest;
      stats.gearLightningDmg = highest;
    }

    // Armor double
    if (flat.armorDouble) {
      stats.armor = Math.floor(stats.armor * 2);
    }

    // Regen boost
    if (flat.regenBoost) {
      stats.lifeRegen = Math.floor(stats.lifeRegen * flat.regenBoost);
    }

    // Spell level bonuses from skill tree
    if (flat.weaponSpellLevel) {
      stats.weaponSpellLevel += flat.weaponSpellLevel;
    }
    if (flat.arcaneSpellLevel) {
      stats.arcaneSpellLevel += flat.arcaneSpellLevel;
    }
    if (flat.versatileSpellLevel) {
      stats.versatileSpellLevel += flat.versatileSpellLevel;
    }

    // Life on Hit % from skill tree: multiplies gear lifeOnHit, floored
    if (pct.lifeOnHit && stats.lifeOnHit > 0) {
      stats.lifeOnHit = Math.floor(stats.lifeOnHit * (1 + pct.lifeOnHit));
    }

    // ── Weapon-type bonuses ──────────────────────────────────
    // Two systems:
    //  1) swordDmg etc. = tree % → applied as damage MULTIPLIER when weapon matches
    //  2) swordAmp etc. = notable amp → multiplies each STAT of the equipped weapon
    const WPN_STAT_TO_SUBTYPES: Record<string, string[]> = {
      swordDmg:  ['oh_sword', 'th_sword'],
      axeDmg:    ['oh_axe', 'th_axe'],
      daggerDmg: ['oh_dagger'],
      wandDmg:   ['oh_wand'],
      maceDmg:   ['oh_mace', 'th_mace'],
      bowDmg:    ['th_bow'],
      staffDmg:  ['th_staff'],
    };
    const WPN_AMP_SUBTYPES: Record<string, string[]> = {
      swordAmp:  ['oh_sword', 'th_sword'],
      axeAmp:    ['oh_axe', 'th_axe'],
      daggerAmp: ['oh_dagger'],
      wandAmp:   ['oh_wand'],
      maceAmp:   ['oh_mace', 'th_mace'],
      bowAmp:    ['th_bow'],
      staffAmp:  ['th_staff'],
    };
    const equippedSubs = stats.weaponSubtypes || [];
    if (equippedSubs.length > 0) {
      // 1) Weapon damage multiplier: tree swordDmg etc. → damage *= (1 + sum)
      let weaponMult = 0;
      for (const [stat, subtypes] of Object.entries(WPN_STAT_TO_SUBTYPES)) {
        const bonus = pct[stat];
        if (!bonus) continue;
        if (equippedSubs.some(sub => subtypes.includes(sub))) {
          weaponMult += bonus;
        }
      }
      if (weaponMult > 0) {
        stats.tapDamage = Math.floor(stats.tapDamage * (1 + weaponMult));
        stats.gearFireDmg = Math.floor(stats.gearFireDmg * (1 + weaponMult));
        stats.gearColdDmg = Math.floor(stats.gearColdDmg * (1 + weaponMult));
        stats.gearLightningDmg = Math.floor(stats.gearLightningDmg * (1 + weaponMult));
      }

      // 2) Weapon amp: notable swordAmp etc. → multiply each stat FROM the weapon
      let totalAmp = 0;
      for (const [ampStat, subtypes] of Object.entries(WPN_AMP_SUBTYPES)) {
        const amp = pct[ampStat];
        if (!amp) continue;
        if (equippedSubs.some(sub => subtypes.includes(sub))) {
          totalAmp += amp;
        }
      }
      if (totalAmp > 0 && stats.weaponBonuses) {
        const wb = stats.weaponBonuses;
        // Amp multiplies each weapon stat contribution
        stats.tapDamage += Math.floor((wb.flatPhysDmg + wb.flatPhysDmg * wb.pctPhysDmg / 100) * totalAmp);
        stats.maxHp += Math.floor(wb.flatHp * (1 + wb.pctHp / 100) * totalAmp);
        stats.hp = Math.min(stats.hp, stats.maxHp);
        stats.critChance += (wb.critChance / 100) * totalAmp;
        stats.critMultiplier += (wb.critMultiplier / 100) * totalAmp;
        stats.gearFireDmg += Math.floor(wb.flatFireDmg * totalAmp);
        stats.gearColdDmg += Math.floor(wb.flatColdDmg * totalAmp);
        stats.gearLightningDmg += Math.floor(wb.flatLightningDmg * totalAmp);
        stats.armor += Math.floor(wb.flatArmor * (1 + wb.pctArmor / 100) * totalAmp);
        stats.lifeOnHit += Math.floor(wb.lifeOnHit * totalAmp);
      }
    }
  }

  /**
   * Re-apply equipment + skill tree bonuses after level-up (base stats changed).
   */
  private reapplyEquipBonuses(stats: CachedCharStats): void {
    // Guard: old Redis sessions may not have equipBonuses
    if (!stats.equipBonuses) return;

    const base = {
      tapDamage: stats.tapDamage,
      maxHp: stats.maxHp,
      hp: stats.hp,
      critChance: stats.critChance,
      critMultiplier: stats.critMultiplier,
      dodgeChance: stats.dodgeChance,
      specialValue: stats.specialValue,
      resistance: stats.resistance || {},
      elementalDamage: stats.elementalDamage || { physical: 1.0 },
    };

    const eff = applyBonuses(base, stats.equipBonuses);

    stats.tapDamage = eff.tapDamage;
    stats.maxHp = eff.maxHp;
    stats.hp = eff.hp;
    stats.critChance = eff.critChance;
    stats.critMultiplier = eff.critMultiplier;
    stats.dodgeChance = eff.dodgeChance;
    stats.resistance = eff.resistance as ElementalResistance;
    stats.gearFireDmg = eff.gearFireDmg;
    stats.gearColdDmg = eff.gearColdDmg;
    stats.gearLightningDmg = eff.gearLightningDmg;
    stats.armor = eff.armor;
    stats.blockChance = eff.blockChance;
    // Update spell level bonuses from equipment
    stats.weaponSpellLevel = eff.weaponSpellLevel;
    stats.arcaneSpellLevel = eff.arcaneSpellLevel;
    stats.versatileSpellLevel = eff.versatileSpellLevel;

    // Re-apply skill tree bonuses on top
    this.applyTreeBonuses(stats);
  }

  /**
   * Load all equipment slots and build combat cache in one query.
   * Returns cached stats (with equipment bonuses) and equipped potions.
   */
  private async buildCombatCache(char: Character): Promise<{
    cachedStats: CachedCharStats;
    equippedPotions: { 'consumable-1': CachedPotion | null; 'consumable-2': CachedPotion | null };
  }> {
    const slots = await this.equipSlotRepo.find({
      where: { characterId: char.id },
      relations: ['item'],
    });

    // Extract potions
    const potions: { 'consumable-1': CachedPotion | null; 'consumable-2': CachedPotion | null } = {
      'consumable-1': null,
      'consumable-2': null,
    };

    // Extract gear items for stat bonuses — separate weapons from other gear
    const weaponItems: Array<{ properties: Record<string, any> }> = [];
    const otherGearItems: Array<{ properties: Record<string, any> }> = [];
    const weaponSubtypes: string[] = [];

    for (const slot of slots) {
      if (!slot.item) continue;

      if (
        (slot.slotId === 'consumable-1' || slot.slotId === 'consumable-2') &&
        slot.item.type === 'potion'
      ) {
        const maxCharges = slot.item.maxCharges!;
        potions[slot.slotId] = {
          itemId: slot.item.id,
          flaskType: slot.item.flaskType!,
          quality: slot.item.quality,
          name: slot.item.name,
          maxCharges,
          currentCharges: maxCharges,
          healPercent: slot.item.healPercent!,
        };
      } else if (slot.item.type === 'equipment') {
        const isWeapon = slot.slotId === 'weapon-left' || slot.slotId === 'weapon-right';
        if (isWeapon) {
          weaponItems.push({ properties: slot.item.properties || {} });
          const sub = slot.item.properties?.subtype as string | undefined;
          if (sub) weaponSubtypes.push(sub);
        } else {
          otherGearItems.push({ properties: slot.item.properties || {} });
        }
      }
    }

    // Aggregate weapon + other gear separately for weapon amp support
    const weaponBonuses = aggregateEquipmentStats(weaponItems);
    const otherBonuses = aggregateEquipmentStats(otherGearItems);

    // Merge: other + weapon (weapon amp applied later in applyTreeBonuses)
    const bonuses = emptyBonuses();
    for (const key of Object.keys(bonuses) as (keyof EquipmentBonuses)[]) {
      (bonuses as any)[key] = (otherBonuses as any)[key] + (weaponBonuses as any)[key];
    }

    const cachedStats = this.buildCachedStats(char, bonuses, weaponSubtypes, weaponBonuses);

    return { cachedStats, equippedPotions: potions };
  }

  // Potion charges are NOT persisted to DB - they reset to max every combat.
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

    // Cache stats + potions at combat start (single DB query for all equipment)
    const { cachedStats, equippedPotions } = await this.buildCombatCache(char);

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
      playerCurrentHp: cachedStats.maxHp,
      playerMaxHp: cachedStats.maxHp,
      lastEnemyAttackTime: now,
      nextAttackIn: this.getFirstAttackDelay(queue[0]),
      cachedStats,
      equippedPotions,
      potionChargesChanged: false, // deprecated - kept for Redis compat
      equippedSkillIds: (char.equippedSkills || []).filter(Boolean) as string[],
      activeEffects: [],
    };

    // Inject act modifiers as permanent effects
    this.injectActModifiers(session, actNumber);

    await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);

    return {
      sessionId,
      totalMonsters: queue.length,
      currentMonster: queue[0] || null,
      playerHp: cachedStats.maxHp,
      playerMaxHp: cachedStats.maxHp,
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

    // Cache stats + potions at combat start (single DB query for all equipment)
    const { cachedStats, equippedPotions } = await this.buildCombatCache(char);

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
      playerCurrentHp: cachedStats.maxHp,
      playerMaxHp: cachedStats.maxHp,
      lastEnemyAttackTime: now,
      nextAttackIn: this.getFirstAttackDelay(queue[0]),
      cachedStats,
      equippedPotions,
      potionChargesChanged: false, // deprecated - kept for Redis compat
      equippedSkillIds: (char.equippedSkills || []).filter(Boolean) as string[],
      activeEffects: [],
    };

    await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);

    return {
      sessionId,
      totalMonsters: queue.length,
      currentMonster: queue[0] || null,
      playerHp: cachedStats.maxHp,
      playerMaxHp: cachedStats.maxHp,
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
   * Start map via DTO from controller - consumes the map key from bag.
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
      // Boss map key - use shared boss key tier defs
      bossId = key.bossId || undefined;
      mapTier = 10;
      const bkt = getBossKeyTierDef(key.bossKeyTier || 1);
      tierHpMul = bkt.hpScale;
      tierGoldMul = bkt.goldScale;
      tierXpMul = bkt.xpScale;
      waves = sharedGetBossMapWaves(bossId!);
    } else {
      // Regular map key - use shared tier definitions (correct multipliers!)
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

    // Pre-compute values used inside attack loop (avoid repeated lookups)
    const tFlat = stats.treeBonuses?.flat || {};
    const classDef = CLASS_DEFS[stats.classId];
    const hasGlancing = !!tFlat.glancingBlows;
    // Single-pass buff aggregation for all effects (instead of 3× sumEffects per attack)
    const eff = this.gatherAllEffects(session);
    const dodgeBuff = eff['self:dodge'] || 0;
    const armorBuff = eff['self:armor'] || 0;
    const damageTakenMod = eff['self:damageTaken'] || 0;
    const effectiveArmor = stats.armor + armorBuff;
    let baseBlockChance = (classDef?.special.id === 'blockChance' ? stats.specialValue : 0)
      + (stats.blockChance || 0);
    if (hasGlancing) baseBlockChance = Math.min(1, baseBlockChance * 2);

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

      // Dodge check (pre-computed dodgeBuff)
      if (Math.random() < stats.dodgeChance + dodgeBuff) {
        // Unique passive: dodgeCounter - on dodge, deal X% damage back
        if (tFlat.dodgeCounter) {
          const counterDmg = Math.floor(stats.tapDamage * tFlat.dodgeCounter);
          if (counterDmg > 0) monster.currentHp -= counterDmg;
        }
        attacks.push({ dodged: true, damage: 0, breakdown: null, attackName });
        session.nextAttackIn = chosenAttack
          ? Math.round((chosenAttack.pauseAfter + 0.3) * 1000)
          : B.ENEMY_ATTACK_INTERVAL_MS;
        continue;
      }

      // Block check (pre-computed baseBlockChance and hasGlancing)
      if (baseBlockChance > 0 && Math.random() < baseBlockChance) {
        // Unique passive: shieldBash - block deals X% tap damage back
        if (tFlat.shieldBash) {
          const bashDmg = Math.floor(stats.tapDamage * tFlat.shieldBash);
          if (bashDmg > 0) monster.currentHp -= bashDmg;
        }

        if (hasGlancing) {
          // Glancing block: take 50% damage instead of 0
          const rawDmg = Math.floor(monster.scaledDamage * dmgMul);
          const halfDmg = Math.floor(rawDmg * 0.5);
          session.playerCurrentHp -= halfDmg;
          if (session.playerCurrentHp < 0) session.playerCurrentHp = 0;
          attacks.push({ dodged: false, blocked: true, damage: halfDmg, breakdown: null, attackName });
        } else {
          attacks.push({ dodged: false, blocked: true, damage: 0, breakdown: null, attackName });
        }
        session.nextAttackIn = chosenAttack
          ? Math.round((chosenAttack.pauseAfter + 0.3) * 1000)
          : B.ENEMY_ATTACK_INTERVAL_MS;
        continue;
      }

      // Compute elemental damage: attack profile + multiplier vs player's resistance
      const rawDamage = Math.floor(monster.scaledDamage * dmgMul);
      const breakdown = computeElementalDamage(rawDamage, dmgProfile, charResistance);

      // Apply armor-based physical damage reduction (pre-computed effectiveArmor)
      // Formula: reduction = armor / (armor + 10 * physicalDamage)
      if (effectiveArmor > 0 && breakdown.total > 0) {
        // Estimate physical portion from the damage profile
        const physFraction = (dmgProfile as any).physical || 0;
        if (physFraction > 0) {
          const physDmg = Math.floor(breakdown.total * physFraction);
          const reduction = effectiveArmor / (effectiveArmor + 10 * physDmg);
          const reduced = Math.floor(physDmg * reduction);
          breakdown.total = Math.max(1, breakdown.total - reduced);
        }
      }

      // Apply damageTaken modifier (pre-computed)
      if (damageTakenMod !== 0) {
        breakdown.total = Math.max(1, Math.floor(breakdown.total * (1 + damageTakenMod)));
      }

      session.playerCurrentHp -= breakdown.total;

      // Unique passive: thorns - reflect X% damage taken back to enemy
      if (tFlat.thorns && breakdown.total > 0) {
        const thornsDmg = Math.floor(breakdown.total * tFlat.thorns);
        if (thornsDmg > 0) monster.currentHp -= thornsDmg;
      }

      // Unique passive: secondWind - X% chance to survive lethal at 1 HP
      if (session.playerCurrentHp <= 0 && tFlat.secondWind && Math.random() < tFlat.secondWind) {
        session.playerCurrentHp = 1;
      }

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

    // Life regeneration: heal based on elapsed time (HP per second)
    if (stats.lifeRegen > 0 && session.playerCurrentHp > 0 && elapsed > 0) {
      const regenHp = Math.floor(stats.lifeRegen * elapsed / 1000);
      if (regenHp > 0) {
        session.playerCurrentHp = Math.min(
          session.playerMaxHp,
          session.playerCurrentHp + regenHp,
        );
      }
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

    // Already dead - nothing to do
    if (session.playerCurrentHp <= 0) {
      return { attacks: [], playerHp: 0, playerMaxHp: session.playerMaxHp, playerDead: true };
    }

    // Purge expired active effects
    this.cleanupEffects(session);

    // Use cached stats from Redis - ZERO DB hit
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
   * Process a tap - server-authoritative damage calculation.
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

    // Player already dead - reject tap
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

    // Use cached stats from Redis - ZERO DB read
    const stats = session.cachedStats;

    // Purge expired active effects
    this.cleanupEffects(session);

    // Single-pass buff/debuff aggregation (one iteration instead of 6)
    const eff = this.gatherAllEffects(session);
    const dmgBuff = eff['self:damage'] || 0;
    const critBuff = eff['self:critChance'] || 0;
    const critVuln = eff['enemy:critVulnerability'] || 0;
    const allVuln = eff['enemy:allVulnerability'] || 0;
    const physVuln = eff['enemy:physicalVulnerability'] || 0;
    const magicVuln = eff['enemy:magicVulnerability'] || 0;
    const armorToDmg = eff['self:armorToDamage'] || 0;

    // Unique passive: luckyHits - roll crit twice, take better
    const treeFlat = stats.treeBonuses?.flat || {};
    const effectiveCritBase = Math.min(1, stats.critChance + critBuff + critVuln);
    let effectiveCrit = effectiveCritBase;
    if (treeFlat.luckyHits) {
      effectiveCrit = 1 - (1 - effectiveCritBase) * (1 - effectiveCritBase);
    }
    const isCrit = Math.random() < effectiveCrit;

    // Hit (basic attack) is a Weapon type — apply level growth
    const hitEffLv = computeEffectiveSkillLevel(
      stats.level, 'weapon',
      stats.weaponSpellLevel ?? 0, stats.arcaneSpellLevel ?? 0, stats.versatileSpellLevel ?? 0,
    );
    const hitGrowth = computeSkillLevelGrowth(hitEffLv);

    // Accumulate all multipliers then floor once to avoid cascading rounding loss
    let rawDamage = (stats.tapDamage + (stats.tapHitBonus || 0)) * hitGrowth * (1 + dmgBuff);
    // Ember Armor: add armor as flat damage bonus
    if (armorToDmg > 0) {
      rawDamage += (stats.armor || 0) * armorToDmg;
    }
    if (isCrit) {
      rawDamage *= stats.critMultiplier;
    }

    // Apply vulnerability multiplier from debuffs
    const vulnMul = 1 + allVuln + physVuln + magicVuln;
    if (vulnMul > 1) {
      rawDamage *= vulnMul;
    }

    // Apply damage to current monster
    const monster = session.monsterQueue[session.currentIndex];
    if (!monster) {
      throw new BadRequestException('No monster to attack');
    }

    // Unique passive: execute - +X% damage to enemies below 30% HP
    if (treeFlat.execute && monster.currentHp < monster.maxHp * 0.3) {
      rawDamage *= (1 + treeFlat.execute);
    }

    // Unique passive: firstStrike - first hit per monster deals X× damage
    if (treeFlat.firstStrike && monster.currentHp === monster.maxHp) {
      rawDamage *= (1 + treeFlat.firstStrike);
    }

    // Unique passive: bossSlayer - +X% damage to bosses
    if (treeFlat.bossSlayer && (monster as any).isBoss) {
      rawDamage *= (1 + treeFlat.bossSlayer);
    }

    // Unique passive: berserkerFury - +1% damage per 2% missing HP
    if (treeFlat.berserkerFury && session.playerCurrentHp < session.playerMaxHp) {
      const missingPct = 1 - session.playerCurrentHp / session.playerMaxHp;
      rawDamage *= (1 + missingPct * 0.5); // 50% max bonus at 1 HP
    }

    rawDamage = Math.floor(rawDamage);

    // Elemental damage: split by profile, reduce by resistance
    const damageProfile = stats.elementalDamage || { physical: 1.0 };
    const monsterResistance = monster.resistance || {};

    // Unique passive: penetration - ignore X% enemy resistance
    let effectiveResistance = monsterResistance;
    if (treeFlat.penetration) {
      effectiveResistance = {} as any;
      for (const [key, val] of Object.entries(monsterResistance)) {
        (effectiveResistance as any)[key] = Math.max(0, (val as number) * (1 - treeFlat.penetration));
      }
    }
    const breakdown = computeElementalDamage(rawDamage, damageProfile, effectiveResistance);

    // Add flat elemental damage from equipment (into breakdown components, after resistance)
    if (stats.gearFireDmg > 0) {
      const fireAfterRes = Math.max(0, Math.floor(stats.gearFireDmg * (1 - Math.min(monsterResistance.fire || 0, 95) / 100)));
      breakdown.fire += fireAfterRes;
      breakdown.total += fireAfterRes;
    }
    if (stats.gearColdDmg > 0) {
      const coldAfterRes = Math.max(0, Math.floor(stats.gearColdDmg * (1 - Math.min(monsterResistance.cold || 0, 95) / 100)));
      breakdown.cold += coldAfterRes;
      breakdown.total += coldAfterRes;
    }
    if (stats.gearLightningDmg > 0) {
      const lightAfterRes = Math.max(0, Math.floor(stats.gearLightningDmg * (1 - Math.min(monsterResistance.lightning || 0, 95) / 100)));
      breakdown.lightning += lightAfterRes;
      breakdown.total += lightAfterRes;
    }

    monster.currentHp -= breakdown.total;
    session.totalTaps++;
    session.lastTapTime = now;

    // Life on Hit: heal player on each tap
    if (stats.lifeOnHit > 0 && session.playerCurrentHp > 0) {
      session.playerCurrentHp = Math.min(
        session.playerMaxHp,
        session.playerCurrentHp + Math.floor(stats.lifeOnHit),
      );
    }

    // Unique passive: lifeSteal - heal X% of damage dealt
    if (treeFlat.lifeSteal && session.playerCurrentHp > 0) {
      const stolen = Math.floor(breakdown.total * treeFlat.lifeSteal);
      if (stolen > 0) {
        session.playerCurrentHp = Math.min(session.playerMaxHp, session.playerCurrentHp + stolen);
      }
    }

    // Unique passive: critHeal - heal flat HP on critical hit
    if (treeFlat.critHeal && isCrit && session.playerCurrentHp > 0) {
      session.playerCurrentHp = Math.min(
        session.playerMaxHp,
        session.playerCurrentHp + Math.floor(treeFlat.critHeal),
      );
    }

    // Unique passive: critExplosion - crits deal X% as passive DPS burst
    if (treeFlat.critExplosion && isCrit) {
      const burstDmg = Math.floor(breakdown.total * treeFlat.critExplosion);
      if (burstDmg > 0) {
        monster.currentHp -= burstDmg;
      }
    }

    // Unique passive: multiStrike - X% chance to hit twice
    if (treeFlat.multiStrike && Math.random() < treeFlat.multiStrike) {
      // Second strike at same damage (no crit reroll)
      monster.currentHp -= breakdown.total;
      session.totalTaps++;
    }

    // Unique passive: cullingStrike - enemies below 10% HP die instantly
    if (treeFlat.cullingStrike && monster.currentHp > 0 && monster.currentHp < monster.maxHp * treeFlat.cullingStrike) {
      monster.currentHp = 0;
    }

    let killed = false;
    let xpGained = 0;
    let leveledUp = false;
    let charLevel = stats.level;
    let charXp = Number(stats.xp);
    let charXpToNext = Number(stats.xpToNext);

    if (monster.currentHp <= 0) {
      monster.currentHp = 0;
      killed = true;

      // Apply goldFind bonus from equipment
      const goldReward = stats.goldFind > 0
        ? Math.floor(monster.goldReward * (1 + stats.goldFind / 100))
        : monster.goldReward;
      session.totalGoldEarned += goldReward;

      // XP level-scaling: XP = BaseXP / (1 + a * D²)
      const D = Math.abs(session.playerLevel - (monster.level || session.playerLevel));
      let scaledXp = Math.max(1, Math.floor(
        monster.xpReward / (1 + B.XP_LEVEL_SCALING_A * D * D),
      ));

      // Apply xpBonus from equipment
      if (stats.xpBonus > 0) {
        scaledXp = Math.floor(scaledXp * (1 + stats.xpBonus / 100));
      }

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

        // Apply class-based stat growth (base stats without equipment)
        const newStatsForLevel = statsAtLevel(stats.classId, stats.level);
        stats.maxHp = newStatsForLevel.hp;
        stats.hp = newStatsForLevel.hp;
        stats.tapDamage = newStatsForLevel.tapDamage;
        stats.critChance = newStatsForLevel.critChance;
        stats.critMultiplier = newStatsForLevel.critMultiplier;
        stats.dodgeChance = newStatsForLevel.dodgeChance;
        stats.specialValue = specialAtLevel(stats.classId, stats.level);
        stats.resistance = newStatsForLevel.resistance as ElementalResistance;

        // Re-apply equipment bonuses on top of new base stats
        this.reapplyEquipBonuses(stats);
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

      // Persist XP/level to DB (base stats only - equipment bonuses are dynamic)
      if (leveledUp) {
        const baseStatsForDb = statsAtLevel(stats.classId, stats.level);
        await this.charRepo.update(session.characterId, {
          level: stats.level,
          xp: stats.xp,
          xpToNext: stats.xpToNext,
          maxHp: baseStatsForDb.hp,
          hp: baseStatsForDb.hp,
          tapDamage: baseStatsForDb.tapDamage,
          critChance: baseStatsForDb.critChance,
          critMultiplier: baseStatsForDb.critMultiplier,
          dodgeChance: baseStatsForDb.dodgeChance,
          specialValue: stats.specialValue,
        });
      } else {
        await this.charRepo.update(session.characterId, {
          xp: stats.xp,
          level: stats.level,
          xpToNext: stats.xpToNext,
        });
      }

      // Clear debuffs tied to the killed monster
      this.clearMonsterDebuffs(session, session.currentIndex);

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
      activeEffects: session.activeEffects,
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

    // Award gold to PlayerLeague - atomic increment (no load+save)
    await this.playerLeagueRepo
      .createQueryBuilder()
      .update(PlayerLeague)
      .set({
        gold: () => `"gold"::bigint + ${session.totalGoldEarned}`,
      })
      .where('id = :id', { id: session.playerLeagueId })
      .execute();

    // Update global lifetime meta stats - atomic increment (no load+save)
    await this.playerRepo
      .createQueryBuilder()
      .update(Player)
      .set({
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

    // XP already awarded per-kill in processTap() - just read current char state
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

    // Roll potion drops (3 independent rolls, ALL combat modes)
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
    }

    // Equipment drops - 4 independent 50% rolls (separate from potion pool)
    {
      const EQUIP_ROLLS = 4;
      const EQUIP_CHANCE = 0.5;
      const ALL_SLOTS: EquipmentSlotId[] = [
        'one_hand', 'two_hand', 'helmet', 'amulet',
        'armor', 'ring', 'gloves', 'belt', 'boots',
      ];

      // Zone level = max monster level in this combat session
      const zoneLevel = session.monsterQueue.length > 0
        ? Math.max(...session.monsterQueue.map(m => m.level))
        : (char?.level ?? session.cachedStats.level);

      const usedSlots = new Set<EquipmentSlotId>();
      for (let i = 0; i < EQUIP_ROLLS; i++) {
        if (Math.random() >= EQUIP_CHANCE) continue;

        // Avoid duplicate slots in the same combat
        const available = ALL_SLOTS.filter(s => !usedSlots.has(s));
        if (available.length === 0) break;
        const slot = available[Math.floor(Math.random() * available.length)];
        usedSlots.add(slot);
        const itemLevel = Math.min(
          Math.max(zoneLevel + Math.floor(Math.random() * 7) - 3, 1),
          100,
        );

        const rolled = rollEquipment(slot, itemLevel);
        const sub = SUBTYPES.find(s => s.code === rolled.subtype);
        const iconPath = pickRandomIcon(rolled.subtype);

        lootDrops.push({
          id: `equip_${rolled.subtype}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: sub?.name ?? rolled.subtype,
          type: 'equipment',
          quality: rolled.rarity,
          level: rolled.itemLevel,
          icon: iconPath,
          acquiredAt: String(Date.now()),
          properties: {
            slot: rolled.slot,
            subtype: rolled.subtype,
            rarity: rolled.rarity,
            itemLevel: rolled.itemLevel,
            reqLevel: rolled.reqLevel,
            baseDamage: rolled.baseDamage,
            baseArmor: rolled.baseArmor,
            baseEvasion: rolled.baseEvasion,
            baseES: rolled.baseES,
            implicit: rolled.implicit,
            stats: rolled.stats,
          },
        });
      }
    }

    // Cap total drops at 4 (4 rolls max by design)
    if (lootDrops.length > 4) lootDrops.length = 4;

    // Save all drops (potions + equipment) to bag
    if (lootDrops.length > 0) {
      await this.lootService.addItemsToBag(
        session.playerLeagueId,
        lootDrops,
      );
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
        level: d.level,
        properties: d.properties,
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
   * Report player death - save audit record and clean up session.
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
   * Start a dojo training session - minimal setup, no monsters or enemy attacks.
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

    const { cachedStats, equippedPotions } = await this.buildCombatCache(char);
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
      playerCurrentHp: cachedStats.maxHp,
      playerMaxHp: cachedStats.maxHp,
      lastEnemyAttackTime: now,
      nextAttackIn: 0,
      cachedStats,
      equippedPotions,
      dojoEndsAt,
      dojoTotalDamage: 0,
      dojoTotalTaps: 0,
      equippedSkillIds: (char.equippedSkills || []).filter(Boolean) as string[],
      activeEffects: [],
    };

    await this.redis.setJson(this.sessionKey(sessionId), session, B.DOJO_SESSION_TTL);

    return { sessionId, dojoEndsAt };
  }

  /**
   * Process a tap in dojo mode - server-authoritative damage, no monster HP.
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

    // Purge expired active effects & gather buffs
    this.cleanupEffects(session);
    const eff = this.gatherAllEffects(session);
    const dmgBuff = eff['self:damage'] || 0;
    const armorToDmg = eff['self:armorToDamage'] || 0;

    const isCrit = Math.random() < stats.critChance;
    let rawDamage = (stats.tapDamage + (stats.tapHitBonus || 0)) * (1 + dmgBuff);
    // Ember Armor: add armor as flat damage bonus
    if (armorToDmg > 0) {
      rawDamage += (stats.armor || 0) * armorToDmg;
    }
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
   * Complete a dojo session - persist best score, clean up.
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
   * Single PostgreSQL INSERT ON CONFLICT with GREATEST - replaces SELECT + INSERT/UPDATE.
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
   * Redis-only - ZERO DB hits. Charges persisted at combat end.
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

    // Read from cached potion data - ZERO DB hit
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

    // Persist to Redis - ZERO DB write
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
   * Cast an active skill - server-authoritative with cooldown validation.
   * Damage = tapDamage × skill.damageMultiplier, using the skill's elemental profile.
   */
  // ─── Effect helpers ──────────────────────────────────────

  /** Inject act modifiers as permanent ActiveEffects (very long TTL). */
  private injectActModifiers(session: RedisCombatSession, actNumber: number): void {
    const mods = getActModifierEffects(actNumber);
    if (!mods.length) return;
    if (!session.activeEffects) session.activeEffects = [];
    const farFuture = Date.now() + 24 * 60 * 60 * 1000; // 24h - outlasts any session
    for (const mod of mods) {
      session.activeEffects.push({
        instanceId: `act${actNumber}_${mod.stat}`,
        effectId: `act_modifier_${mod.stat}`,
        sourceSkillId: 'act_modifier',
        target: mod.target,
        stat: mod.stat,
        value: mod.value,
        expiresAt: farFuture,
        refreshable: false,
      });
    }
  }

  /** Purge expired effects and debuffs on dead monsters */
  private cleanupEffects(session: RedisCombatSession): void {
    if (!session.activeEffects) return;
    const now = Date.now();
    session.activeEffects = session.activeEffects.filter(e => e.expiresAt > now);
  }

  /** Clear all debuffs on the current monster (called on monster death) */
  private clearMonsterDebuffs(session: RedisCombatSession, monsterIndex: number): void {
    if (!session.activeEffects) return;
    session.activeEffects = session.activeEffects.filter(
      e => !(e.target === 'enemy' && e.monsterIndex === monsterIndex),
    );
  }

  /**
   * Single-pass buff/debuff aggregation - collects ALL active effects in one iteration.
   * Returns sums keyed as "self:damage", "enemy:allVulnerability", etc.
   */
  private gatherAllEffects(session: RedisCombatSession): Record<string, number> {
    const totals: Record<string, number> = {};
    if (!session.activeEffects) return totals;
    const now = Date.now();
    const monIdx = session.currentIndex;
    for (const e of session.activeEffects) {
      if (e.expiresAt <= now) continue;
      if (e.target === 'enemy' && e.monsterIndex !== monIdx) continue;
      const key = e.target + ':' + e.stat;
      totals[key] = (totals[key] || 0) + e.value;
    }
    return totals;
  }

  /** Sum all active effect values for a given target+stat */
  private sumEffects(session: RedisCombatSession, target: 'self' | 'enemy', stat: string): number {
    if (!session.activeEffects) return 0;
    const now = Date.now();
    let total = 0;
    for (const e of session.activeEffects) {
      if (e.target === target && e.stat === stat && e.expiresAt > now) {
        if (target === 'enemy' && e.monsterIndex !== session.currentIndex) continue;
        total += e.value;
      }
    }
    return total;
  }

  // ─── Cast skill ────────────────────────────────────────

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

    // Player dead - reject
    if (session.playerCurrentHp <= 0) {
      throw new BadRequestException('Player is dead');
    }

    // Validate skill is equipped
    if (session.equippedSkillIds && session.equippedSkillIds.length > 0) {
      if (!session.equippedSkillIds.includes(skillId)) {
        throw new BadRequestException('Skill not equipped');
      }
    }

    // Cooldown check (server-authoritative anti-cheat)
    const now = Date.now();
    if (!session.skillCooldowns) session.skillCooldowns = {};
    const lastCast = session.skillCooldowns[skillId] || 0;
    if (now - lastCast < skillDef.cooldownMs) {
      throw new BadRequestException('Skill on cooldown');
    }

    // Purge expired effects
    this.cleanupEffects(session);

    const stats = session.cachedStats;
    session.skillCooldowns[skillId] = now;
    if (!session.activeEffects) session.activeEffects = [];

    // ── Heal ──
    if (skillDef.skillType === 'heal' && skillDef.healPercent) {
      const healAmount = Math.floor(session.playerMaxHp * skillDef.healPercent);
      session.playerCurrentHp = Math.min(
        session.playerMaxHp,
        session.playerCurrentHp + healAmount,
      );

      await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);
      return {
        skillId,
        skillType: 'heal',
        healAmount,
        damage: 0,
        damageBreakdown: { total: 0, physical: 0, fire: 0, lightning: 0, cold: 0, pure: 0 },
        isCrit: false,
        monsterHp: session.monsterQueue[session.currentIndex]?.currentHp ?? 0,
        monsterMaxHp: session.monsterQueue[session.currentIndex]?.maxHp ?? 0,
        killed: false,
        isComplete: session.currentIndex >= session.monsterQueue.length,
        currentMonster: session.monsterQueue[session.currentIndex] || null,
        monstersRemaining: session.monsterQueue.length - session.currentIndex,
        playerHp: session.playerCurrentHp,
        playerMaxHp: session.playerMaxHp,
        playerDead: false,
        xpGained: 0,
        leveledUp: false,
        level: stats.level,
        xp: Number(stats.xp),
        xpToNext: Number(stats.xpToNext),
        cooldownUntil: now + skillDef.cooldownMs,
        activeEffects: session.activeEffects,
      };
    }

    // ── Buff / Debuff ──
    if ((skillDef.skillType === 'buff' || skillDef.skillType === 'debuff') && skillDef.effect) {
      const eff = skillDef.effect;

      // Check for existing effect to refresh or add new
      const existing = session.activeEffects.find(
        e => e.effectId === eff.id && e.target === eff.target,
      );

      if (existing && eff.refreshable) {
        existing.expiresAt = now + eff.durationMs;
      } else if (!existing) {
        session.activeEffects.push({
          instanceId: `${eff.id}_${now}`,
          effectId: eff.id,
          sourceSkillId: skillId,
          target: eff.target === 'self' ? 'self' : 'enemy',
          stat: eff.stat,
          value: eff.value,
          expiresAt: now + eff.durationMs,
          monsterIndex: eff.target === 'enemy' ? session.currentIndex : undefined,
          refreshable: eff.refreshable,
        });
      }

      await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);
      return {
        skillId,
        skillType: skillDef.skillType,
        effectId: eff.id,
        effectDuration: eff.durationMs,
        damage: 0,
        damageBreakdown: { total: 0, physical: 0, fire: 0, lightning: 0, cold: 0, pure: 0 },
        isCrit: false,
        monsterHp: session.monsterQueue[session.currentIndex]?.currentHp ?? 0,
        monsterMaxHp: session.monsterQueue[session.currentIndex]?.maxHp ?? 0,
        killed: false,
        isComplete: session.currentIndex >= session.monsterQueue.length,
        currentMonster: session.monsterQueue[session.currentIndex] || null,
        monstersRemaining: session.monsterQueue.length - session.currentIndex,
        playerHp: session.playerCurrentHp,
        playerMaxHp: session.playerMaxHp,
        playerDead: false,
        xpGained: 0,
        leveledUp: false,
        level: stats.level,
        xp: Number(stats.xp),
        xpToNext: Number(stats.xpToNext),
        cooldownUntil: now + skillDef.cooldownMs,
        activeEffects: session.activeEffects,
      };
    }

    // ── Damage skill ──
    const monster = session.monsterQueue[session.currentIndex];
    if (!monster) {
      throw new BadRequestException('No monster to attack');
    }

    // Single-pass buff/debuff aggregation (one iteration instead of 6)
    const eff = this.gatherAllEffects(session);
    const dmgBuff = eff['self:damage'] || 0;
    const critBuff = eff['self:critChance'] || 0;
    const allVuln = eff['enemy:allVulnerability'] || 0;
    const critVuln = eff['enemy:critVulnerability'] || 0;
    const physVuln = eff['enemy:physicalVulnerability'] || 0;
    const magicVuln = eff['enemy:magicVulnerability'] || 0;
    const armorToDmg = eff['self:armorToDamage'] || 0;

    // Crit roll with buff bonus
    const effectiveCritChance = Math.min(1, stats.critChance + critBuff + critVuln);
    const isCrit = Math.random() < effectiveCritChance;

    // Per-skill scaling: Weapon vs Arcane type
    const scalingType = getSkillScalingType(skillDef);
    const effLv = computeEffectiveSkillLevel(
      stats.level, scalingType,
      stats.weaponSpellLevel ?? 0, stats.arcaneSpellLevel ?? 0, stats.versatileSpellLevel ?? 0,
    );
    const levelGrowth = computeSkillLevelGrowth(effLv);

    // Arcane spells use own base damage; Weapon spells use tapDamage × multiplier
    let rawDamage: number;
    if (scalingType === 'arcane') {
      rawDamage = skillDef.spellBase! * levelGrowth * (1 + dmgBuff);
    } else {
      rawDamage = stats.tapDamage * skillDef.damageMultiplier * levelGrowth * (1 + dmgBuff);
    }
    // Ember Armor: add armor as flat damage bonus
    if (armorToDmg > 0) {
      rawDamage += (stats.armor || 0) * armorToDmg;
    }
    if (isCrit) {
      rawDamage *= stats.critMultiplier;
    }

    // Apply vulnerability multiplier
    const vulnMul = 1 + allVuln + physVuln + magicVuln;
    rawDamage = Math.floor(rawDamage * vulnMul);

    // Elemental damage using skill's profile vs monster resistance
    const monsterResistance = monster.resistance || {};
    const breakdown = computeElementalDamage(rawDamage, skillDef.elementalProfile, monsterResistance);

    // Apply elemental % bonuses from skill tree to skill's elemental damage portions
    // (same bonuses that boost tap damage — fire/cold/lightning % nodes should work for skills too)
    const treePct = stats.treeBonuses?.percent || {};
    if (treePct.fireDmg && breakdown.fire > 0) {
      const bonus = Math.floor(breakdown.fire * treePct.fireDmg);
      breakdown.fire += bonus;
      breakdown.total += bonus;
    }
    if (treePct.coldDmg && breakdown.cold > 0) {
      const bonus = Math.floor(breakdown.cold * treePct.coldDmg);
      breakdown.cold += bonus;
      breakdown.total += bonus;
    }
    if (treePct.lightningDmg && breakdown.lightning > 0) {
      const bonus = Math.floor(breakdown.lightning * treePct.lightningDmg);
      breakdown.lightning += bonus;
      breakdown.total += bonus;
    }

    monster.currentHp -= breakdown.total;

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
      if (leveledUp) {
        // Re-apply equipment bonuses on new base stats (same as processTap)
        this.reapplyEquipBonuses(stats);
      }
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

      // Clear debuffs tied to the killed monster
      this.clearMonsterDebuffs(session, session.currentIndex);

      session.currentIndex++;
      session.lastEnemyAttackTime = now;
      const nextMonster = session.monsterQueue[session.currentIndex];
      session.nextAttackIn = this.getFirstAttackDelay(nextMonster);
    }

    const isComplete = session.currentIndex >= session.monsterQueue.length;
    await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);

    return {
      skillId,
      skillType: 'damage',
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
      activeEffects: session.activeEffects,
    };
  }
}
