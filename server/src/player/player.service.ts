import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '../shared/entities/player.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { aggregateEquipmentStats, applyBonuses } from '@shared/equipment-bonus';
import { buildSkillTree } from '@shared/skill-tree';

const DAILY_BONUS_WINS_MAX = 3;

/**
 * Get current UTC date as YYYY-MM-DD string.
 */
function getUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class PlayerService {
  constructor(
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
    @InjectRepository(PlayerLeague)
    private playerLeagueRepo: Repository<PlayerLeague>,
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
   * Includes ban status — client must check and block game if banned.
   *
   * Optimized: single player query + single allPlayerLeagues query
   * (no duplicate getPlayer/getActivePlayerLeague calls).
   */
  async getPlayerState(telegramId: string) {
    // Single player query (no relations — lightweight)
    const player = await this.playerRepo.findOne({
      where: { telegramId },
    });
    if (!player) throw new NotFoundException('Player not found');

    // Ban check — return ban info before loading heavy data
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
              // Gear item — include all properties
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
              // Potion / other — legacy format
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

}
