import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Player } from '../shared/entities/player.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { ShardTransaction } from '../shared/entities/shard-transaction.entity';
import { aggregateEquipmentStats, applyBonuses } from '@shared/equipment-bonus';
import { buildSkillTree } from '@shared/skill-tree';
import { computeAllocatedBonuses } from '@shared/skill-node-defs';
import { statsAtLevel } from '@shared/class-stats';
import { B } from '@shared/balance';

const DAILY_BONUS_WINS_MAX = 3;

/**
 * Get current UTC date as YYYY-MM-DD string.
 */
function getUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class PlayerService {
  private readonly logger = new Logger('PlayerService');

  constructor(
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
    @InjectRepository(PlayerLeague)
    private playerLeagueRepo: Repository<PlayerLeague>,
    private dataSource: DataSource,
  ) {}

  async getPlayer(telegramId: string): Promise<Player> {
    const player = await this.playerRepo.findOne({
      where: { telegramId },
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }
    return player;
  }

  /**
   * Get the player's active PlayerLeague (with characters, equipment, items).
   */
  async getActivePlayerLeague(telegramId: string): Promise<PlayerLeague> {
    const player = await this.playerRepo.findOne({
      where: { telegramId },
      select: ['telegramId', 'activeLeagueId'],
    });
    if (!player) throw new NotFoundException('Player not found');

    if (!player.activeLeagueId) {
      throw new NotFoundException('No active league. Join a league first.');
    }

    const pl = await this.playerLeagueRepo.findOne({
      where: {
        playerTelegramId: telegramId,
        leagueId: player.activeLeagueId,
      },
      relations: [
        'league',
        'characters',
        'characters.equipmentSlots',
        'characters.equipmentSlots.item',
        'items',
      ],
    });

    if (!pl) {
      throw new NotFoundException('Player not in active league');
    }

    return pl;
  }

  /**
   * Get all PlayerLeagues for a player (with characters + equipment + items).
   */
  async getAllPlayerLeagues(telegramId: string): Promise<PlayerLeague[]> {
    return this.playerLeagueRepo.find({
      where: { playerTelegramId: telegramId },
      relations: [
        'league',
        'characters',
        'characters.equipmentSlots',
        'characters.equipmentSlots.item',
        'items',
      ],
    });
  }

  /**
   * Get full player state with ALL characters from ALL leagues.
   * Includes ban status - client must check and block game if banned.
   *
   * Optimized: single player query + single allPlayerLeagues query
   * (no duplicate getPlayer/getActivePlayerLeague calls).
   */
  async getPlayerState(telegramId: string) {
    // Single player query (no relations - lightweight)
    const player = await this.playerRepo.findOne({
      where: { telegramId },
    });
    if (!player) throw new NotFoundException('Player not found');

    // Ban check - return ban info before loading heavy data
    const isBanned = player.bannedUntil && player.bannedUntil.getTime() > Date.now();
    if (isBanned) {
      return {
        banned: true,
        bannedUntil: player.bannedUntil!.getTime(),
        banReason: player.banReason || 'rate_limit',
      };
    }

    if (!player.activeLeagueId) {
      throw new NotFoundException('No active league. Join a league first.');
    }

    // Single query: all player leagues with deep relations
    const allPlayerLeagues = await this.playerLeagueRepo.find({
      where: { playerTelegramId: telegramId },
      relations: [
        'league',
        'characters',
        'characters.equipmentSlots',
        'characters.equipmentSlots.item',
        'items',
      ],
    });

    // Find active PlayerLeague from the already-loaded array (no extra query)
    const pl = allPlayerLeagues.find(
      (p) => p.leagueId === player.activeLeagueId,
    );
    if (!pl) {
      throw new NotFoundException('Player not in active league');
    }

    // Collect all characters from all leagues
    const today = getUtcDateString();
    const allCharacters: any[] = [];
    let skillTree: ReturnType<typeof buildSkillTree> | null = null;
    for (const playerLeague of allPlayerLeagues) {
      for (const c of playerLeague.characters || []) {
        // Calculate daily bonus remaining
        const bonusUsed = c.dailyBonusResetDate === today ? c.dailyBonusWinsUsed : 0;
        const dailyBonusRemaining = DAILY_BONUS_WINS_MAX - bonusUsed;

        // Build equipment map from EquipmentSlot relations (same shape as old JSONB)
        const equipmentMap: Record<string, any> = {};
        const gearItems: Array<{ properties: Record<string, any> }> = [];
        for (const slot of c.equipmentSlots || []) {
          if (slot.item) {
            if (slot.item.type === 'equipment') {
              // Gear item - include all properties
              equipmentMap[slot.slotId] = {
                bagItemId: slot.item.id,
                name: slot.item.name,
                type: slot.item.type,
                quality: slot.item.quality,
                level: slot.item.level,
                icon: slot.item.icon,
                properties: slot.item.properties || {},
              };
              gearItems.push({ properties: slot.item.properties || {} });
            } else {
              // Potion / other - legacy format
              equipmentMap[slot.slotId] = {
                bagItemId: slot.item.id,
                flaskType: slot.item.flaskType,
                quality: slot.item.quality,
                name: slot.item.name,
                maxCharges: slot.item.maxCharges,
                currentCharges: slot.item.maxCharges, // always full outside combat
                healPercent: slot.item.healPercent,
              };
            }
          }
        }

        // Compute equipment-adjusted effective stats
        const bonuses = aggregateEquipmentStats(gearItems);
        const eff = applyBonuses(
          {
            tapDamage: c.tapDamage,
            maxHp: c.maxHp,
            hp: c.hp,
            critChance: c.critChance,
            critMultiplier: c.critMultiplier,
            dodgeChance: c.dodgeChance,
            specialValue: c.specialValue,
            resistance: c.resistance || {},
            elementalDamage: c.elementalDamage || { physical: 1.0 },
          },
          bonuses,
        );

        // Apply skill tree bonuses (additive from base stats, same as combat)
        const allocSet = new Set<number>(c.allocatedNodes || []);
        if (allocSet.size > 0) {
          if (!skillTree) skillTree = buildSkillTree();
          const treeBonuses = computeAllocatedBonuses(skillTree.nodes, allocSet);
          const pct = treeBonuses.percent;
          const base = statsAtLevel(c.classId, c.level);

          eff.tapDamage += Math.floor(base.tapDamage * (pct.tapDamage || 0));
          eff.maxHp += Math.floor(base.hp * (pct.hp || 0));
          eff.hp = Math.min(eff.hp, eff.maxHp);
          eff.critChance += (pct.critChance || 0);
          eff.critMultiplier += (pct.critMultiplier || 0);
          eff.dodgeChance += (pct.dodgeChance || 0);
          eff.gearFireDmg += Math.floor(base.tapDamage * (pct.fireDmg || 0));
          eff.gearColdDmg += Math.floor(base.tapDamage * (pct.coldDmg || 0));
          eff.gearLightningDmg += Math.floor(base.tapDamage * (pct.lightningDmg || 0));

          // Unique elemental conversions
          const flat = treeBonuses.flat || {};
          if (flat.fireFromLightning) eff.gearFireDmg = Math.max(eff.gearFireDmg, eff.gearLightningDmg);
          if (flat.coldFromFire) eff.gearColdDmg = Math.max(eff.gearColdDmg, eff.gearFireDmg);
          if (flat.lightningFromCold) eff.gearLightningDmg = Math.max(eff.gearLightningDmg, eff.gearColdDmg);
          if (flat.allElemental) {
            const hi = Math.max(eff.gearFireDmg, eff.gearColdDmg, eff.gearLightningDmg);
            eff.gearFireDmg = hi; eff.gearColdDmg = hi; eff.gearLightningDmg = hi;
          }
          if (flat.armorDouble) eff.armor = Math.floor(eff.armor * 2);
          if (flat.regenBoost) eff.lifeRegen = Math.floor(eff.lifeRegen * (flat.regenBoost as number));
        }

        allCharacters.push({
          id: c.id,
          nickname: c.nickname,
          classId: c.classId,
          skinId: c.skinId,
          leagueId: c.leagueId,
          leagueName: playerLeague.league?.name || 'Unknown',
          leagueType: playerLeague.league?.type || 'standard',
          createdAt: Number(c.createdAt),
          level: c.level,
          xp: Number(c.xp),
          xpToNext: Number(c.xpToNext),
          // Effective stats (with equipment bonuses)
          hp: eff.hp,
          maxHp: eff.maxHp,
          tapDamage: eff.tapDamage,
          critChance: eff.critChance,
          critMultiplier: eff.critMultiplier,
          dodgeChance: eff.dodgeChance,
          specialValue: eff.specialValue,
          resistance: eff.resistance,
          elementalDamage: eff.elementalDamage,
          // Equipment bonus utility stats (for UI display)
          gearFireDmg: eff.gearFireDmg,
          gearColdDmg: eff.gearColdDmg,
          gearLightningDmg: eff.gearLightningDmg,
          goldFind: eff.goldFind,
          xpBonus: eff.xpBonus,
          lifeOnHit: eff.lifeOnHit,
          lifeRegen: eff.lifeRegen,
          armor: eff.armor,
          blockChance: eff.blockChance,
          weaponSpellLevel: eff.weaponSpellLevel,
          arcaneSpellLevel: eff.arcaneSpellLevel,
          versatileSpellLevel: eff.versatileSpellLevel,
          passiveDpsBonus: eff.passiveDpsBonus,
          combat: {
            currentStage: c.combatCurrentStage,
            currentWave: c.combatCurrentWave,
            wavesPerStage: c.combatWavesPerStage,
          },
          locations: {
            completed: c.completedLocations,
            current: c.currentLocation,
            currentAct: c.currentAct,
          },
          inventory: {
            items: [],
            equipment: equipmentMap,
          },
          endgame: {
            unlocked: c.endgameUnlocked,
            completedBosses: c.completedBosses,
            highestTierCompleted: c.highestTierCompleted,
            totalMapsRun: c.totalMapsRun,
          },
          allocatedNodes: c.allocatedNodes || [],
          ...this.deriveSkillFields(c),
          dailyBonusRemaining,
        });
      }
    }

    return {
      banned: false,
      gold: pl.gold,
      shards: player.shards,
      extraTradeSlots: player.extraTradeSlots,
      maxTradeSlots: B.BASE_TRADE_SLOTS + player.extraTradeSlots,
      purchasedSkins: player.purchasedSkins || [],
      hasReferrer: !!player.referrerId,
      referrerName: player.referrerId
        ? await this.playerRepo.findOne({ where: { telegramId: player.referrerId }, select: ['telegramUsername', 'telegramFirstName'] })
            .then(r => r?.telegramUsername ? `@${r.telegramUsername}` : r?.telegramFirstName || `ID ${player.referrerId}`)
        : null,
      referralCount: await this.playerRepo.count({ where: { referrerId: player.telegramId } }),
      referralIncome: await this.dataSource.query(
        `SELECT COALESCE(SUM(amount), 0)::int AS total FROM shard_transactions WHERE "playerTelegramId" = $1 AND reason = 'referral_income'`,
        [player.telegramId],
      ).then((rows: any[]) => rows[0]?.total || 0),
      activeLeagueId: player.activeLeagueId,
      activeCharacterId: pl.activeCharacterId,
      league: {
        id: pl.leagueId,
        name: pl.league?.name,
        type: pl.league?.type,
      },
      characters: allCharacters,
      // Bag: only items with status='bag' (per-league, shared among characters)
      bag: (pl.items || [])
        .filter((item) => item.status === 'bag')
        .map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          quality: item.quality,
          level: item.level,
          icon: item.icon,
          acquiredAt: Number(item.acquiredAt),
          tier: item.tier,
          locationId: item.locationId,
          locationAct: item.locationAct,
          bossId: item.bossId,
          bossKeyTier: item.bossKeyTier,
          flaskType: item.flaskType,
          maxCharges: item.maxCharges,
          currentCharges: item.currentCharges,
          healPercent: item.healPercent,
          properties: item.properties || {},
        })),
      meta: {
        lastSaveTime: Number(player.lastSaveTime),
        totalTaps: Number(player.totalTaps),
        totalKills: Number(player.totalKills),
        version: player.gameVersion,
      },
    };
  }

  /**
   * Update gold on the active league's PlayerLeague entry.
   * Optimized: uses increment + single lightweight query instead of load+save.
   */
  async updateGold(telegramId: string, amount: number): Promise<string> {
    const player = await this.playerRepo.findOne({
      where: { telegramId },
      select: ['telegramId', 'activeLeagueId'],
    });
    if (!player || !player.activeLeagueId) {
      throw new NotFoundException('No active league');
    }

    const pl = await this.playerLeagueRepo.findOne({
      where: {
        playerTelegramId: telegramId,
        leagueId: player.activeLeagueId,
      },
      select: ['id', 'gold'],
    });
    if (!pl) throw new NotFoundException('Player not in active league');

    const newGold = BigInt(pl.gold) + BigInt(amount);
    const clampedGold = String(newGold < 0n ? 0n : newGold);

    await this.playerLeagueRepo.update(pl.id, { gold: clampedGold });
    await this.playerRepo.update(telegramId, {
      lastSaveTime: String(Date.now()),
    });

    return clampedGold;
  }

  /**
   * Update global lifetime meta-stats (across all leagues).
   * Optimized: single raw query with atomic increment instead of load+save.
   */
  async updateMeta(
    telegramId: string,
    taps: number,
    kills: number,
  ): Promise<void> {
    await this.playerRepo
      .createQueryBuilder()
      .update(Player)
      .set({
        totalTaps: () => `"totalTaps" + ${taps}`,
        totalKills: () => `"totalKills" + ${kills}`,
        lastSaveTime: String(Date.now()),
      })
      .where('telegramId = :telegramId', { telegramId })
      .execute();
  }

  /**
   * Derive unlockedActiveSkills from allocatedNodes on the fly,
   * and auto-fill equippedSkills from unlocked if slots are empty.
   * This handles characters whose allocations were saved before
   * the sync logic was added to acceptAllocations.
   */
  private deriveSkillFields(c: any): {
    unlockedActiveSkills: string[];
    equippedSkills: (string | null)[];
  } {
    const tree = buildSkillTree();
    const allocated = c.allocatedNodes || [];

    // Derive unlocked from allocated activeSkill nodes
    const unlocked: string[] = [];
    for (const nodeId of allocated) {
      const node = tree.nodes[nodeId];
      if (node && node.type === 'activeSkill' && node.def?.activeSkillId) {
        unlocked.push(node.def.activeSkillId);
      }
    }

    // Start with stored equipped, clean up invalid entries
    const unlockedSet = new Set(unlocked);
    const equipped: (string | null)[] = [...(c.equippedSkills || [null, null, null, null])];
    while (equipped.length < 4) equipped.push(null);
    for (let i = 0; i < equipped.length; i++) {
      if (equipped[i] && !unlockedSet.has(equipped[i]!)) equipped[i] = null;
    }

    // Auto-fill empty slots with unlocked skills
    const alreadyEquipped = new Set(equipped.filter(Boolean));
    for (const skillId of unlocked) {
      if (alreadyEquipped.has(skillId)) continue;
      const emptySlot = equipped.indexOf(null);
      if (emptySlot === -1) break;
      equipped[emptySlot] = skillId;
      alreadyEquipped.add(skillId);
    }

    return { unlockedActiveSkills: unlocked, equippedSkills: equipped };
  }

  /**
   * Apply a referral code (referrer's telegramId).
   * Awards REFERRAL_REWARD_SHARDS to both players.
   */
  async applyReferral(telegramId: string, referralCode: string): Promise<{ success: boolean }> {
    if (!referralCode || !/^\d+$/.test(referralCode)) {
      throw new BadRequestException('Invalid referral code');
    }

    if (referralCode === telegramId) {
      throw new BadRequestException('Cannot refer yourself');
    }

    return this.dataSource.transaction(async (em) => {
      const [player, referrer] = await Promise.all([
        em.findOne(Player, { where: { telegramId }, lock: { mode: 'pessimistic_write' } }),
        em.findOne(Player, { where: { telegramId: referralCode }, lock: { mode: 'pessimistic_write' } }),
      ]);

      if (!player) throw new NotFoundException('Player not found');
      if (!referrer) throw new BadRequestException('Referral code not found');
      if (player.referrerId) throw new BadRequestException('Already have a referrer');

      const reward = B.REFERRAL_REWARD_SHARDS;

      // Award shards to player
      const playerShards = BigInt(player.shards) + BigInt(reward);
      player.shards = playerShards.toString();
      player.referrerId = referralCode;
      await em.save(Player, player);

      // Award shards to referrer
      const referrerShards = BigInt(referrer.shards) + BigInt(reward);
      referrer.shards = referrerShards.toString();
      await em.save(Player, referrer);

      // Log transactions
      const txPlayer = em.create(ShardTransaction, {
        playerTelegramId: telegramId,
        type: 'purchase',
        amount: reward,
        balanceAfter: playerShards.toString(),
        reason: 'referral_bonus',
        referenceId: referralCode,
      });
      const txReferrer = em.create(ShardTransaction, {
        playerTelegramId: referralCode,
        type: 'purchase',
        amount: reward,
        balanceAfter: referrerShards.toString(),
        reason: 'referral_bonus',
        referenceId: telegramId,
      });
      await em.save(ShardTransaction, [txPlayer, txReferrer]);

      this.logger.log(`Referral applied: ${telegramId} referred by ${referralCode}, +${reward} shards each`);

      return { success: true };
    });
  }

}
