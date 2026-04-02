import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { DojoRecord } from '../shared/entities/dojo-record.entity';
import { Character } from '../shared/entities/character.entity';
import { League } from '../shared/entities/league.entity';
import { Player } from '../shared/entities/player.entity';
import { aggregateEquipmentStats, applyBonuses } from '@shared/equipment-bonus';
import { statsAtLevel, CLASS_DEFS } from '@shared/class-stats';
import { buildSkillTree } from '@shared/skill-tree';
import { computeAllocatedBonuses } from '@shared/skill-node-defs';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(DojoRecord)
    private dojoRecordRepo: Repository<DojoRecord>,
    @InjectRepository(Character)
    private characterRepo: Repository<Character>,
    @InjectRepository(League)
    private leagueRepo: Repository<League>,
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
  ) {}

  /**
   * Returns all active leagues with online player counts.
   * "Online" = lastSeenAt within the last 60 seconds AND activeLeagueId matches.
   */
  async getOnlineByLeague() {
    const leagues = await this.leagueRepo.find({
      where: { status: 'active' },
      order: { type: 'ASC', startsAt: 'DESC' },
    });

    const oneMinuteAgo = new Date(Date.now() - 60_000);

    const results = await Promise.all(
      leagues.map(async (league) => {
        const online = await this.playerRepo.count({
          where: {
            activeLeagueId: league.id,
            lastSeenAt: MoreThan(oneMinuteAgo),
          },
        });
        return {
          id: league.id,
          name: league.name,
          type: league.type,
          startsAt: league.startsAt,
          endsAt: league.endsAt,
          online,
        };
      }),
    );

    const totalOnline = results.reduce((sum, l) => sum + l.online, 0);

    return { leagues: results, totalOnline };
  }

  /** Return all active leagues for the wiki league selector */
  async getActiveLeagues() {
    const leagues = await this.leagueRepo.find({
      where: { status: 'active' },
      order: { type: 'ASC', startsAt: 'DESC' },
    });

    return {
      leagues: leagues.map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        startsAt: l.startsAt,
        endsAt: l.endsAt,
      })),
    };
  }

  /**
   * Global dojo leaderboard: top N by best damage.
   * Uses denormalized leagueId on dojo_records - no JOIN with characters needed.
   */
  async getDojoLeaderboard(limit = 50, leagueId?: string) {
    const where: any = {};
    if (leagueId) {
      where.leagueId = leagueId;
    }

    const records = await this.dojoRecordRepo.find({
      where,
      order: { bestDamage: 'DESC' },
      take: limit,
    });

    return {
      leaderboard: records.map((r, i) => ({
        rank: i + 1,
        characterId: r.characterId,
        nickname: r.nickname,
        classId: r.classId,
        skinId: r.skinId,
        level: r.level,
        bestDamage: r.bestDamage,
        telegramUsername: r.telegramUsername || null,
      })),
    };
  }

  /**
   * Global XP leaderboard: top N characters by level + xp.
   * If leagueId is provided, filter to characters in that league.
   */
  async getXpLeaderboard(limit = 50, leagueId?: string) {
    const qb = this.characterRepo
      .createQueryBuilder('c')
      .leftJoin('c.player', 'p')
      .select([
        'c.id',
        'c.nickname',
        'c.classId',
        'c.skinId',
        'c.level',
        'c.xp',
        'c.tapDamage',
        'c.critChance',
        'c.critMultiplier',
        'c.dojoBestDamage',
        'p.telegramUsername',
      ])
      .orderBy('c.level', 'DESC')
      .addOrderBy('c.xp', 'DESC')
      .take(limit);

    if (leagueId) {
      qb.where('c.leagueId = :leagueId', { leagueId });
    }

    const characters = await qb.getMany();

    return {
      leaderboard: characters.map((c, i) => ({
        rank: i + 1,
        characterId: c.id,
        nickname: c.nickname,
        classId: c.classId,
        skinId: c.skinId,
        level: c.level,
        xp: c.xp,
        tapDamage: c.tapDamage,
        critChance: c.critChance,
        critMultiplier: c.critMultiplier,
        dojoBestDamage: c.dojoBestDamage,
        telegramUsername: c.player?.telegramUsername || null,
      })),
    };
  }

  /**
   * Public character profile: stats, equipment, skill tree, progression.
   */
  async getCharacterProfile(characterId: string) {
    const char = await this.characterRepo.findOne({
      where: { id: characterId },
      relations: ['player', 'equipmentSlots', 'equipmentSlots.item'],
    });

    if (!char) return null;

    // Get league name
    const league = await this.leagueRepo.findOne({ where: { id: char.leagueId } });

    // Build equipment map: slotId -> item summary
    const equipment: Record<string, any> = {};
    if (char.equipmentSlots) {
      for (const slot of char.equipmentSlots) {
        if (slot.item) {
          equipment[slot.slotId] = {
            name: slot.item.name,
            type: slot.item.type,
            quality: slot.item.quality,
            icon: slot.item.icon,
            flaskType: slot.item.flaskType,
            healPercent: slot.item.healPercent,
            maxCharges: slot.item.maxCharges,
            currentCharges: slot.item.currentCharges,
            level: slot.item.level,
            tier: slot.item.tier,
            bossKeyTier: slot.item.bossKeyTier,
          };
        }
      }
    }

    // Compute effective stats (equipment + tree bonuses) for profile display
    const gearItems = char.equipmentSlots
      ?.filter(s => s.item && s.item.type === 'equipment')
      .map(s => ({ properties: s.item!.properties || {} })) || [];
    const bonuses = aggregateEquipmentStats(gearItems);
    const base = statsAtLevel(char.classId, char.level);
    const eff = applyBonuses(
      { tapDamage: base.tapDamage, maxHp: base.hp, hp: char.hp, critChance: base.critChance, critMultiplier: base.critMultiplier, dodgeChance: base.dodgeChance, specialValue: char.specialValue, resistance: base.resistance, elementalDamage: char.elementalDamage || {} },
      bonuses,
    );

    // Apply tree bonuses
    const allocSet = new Set<number>(char.allocatedNodes || []);
    if (allocSet.size > 0) {
      const skillTree = buildSkillTree();
      const treeBonuses = computeAllocatedBonuses(skillTree.nodes, allocSet);
      const pct = treeBonuses.percent;
      eff.tapDamage += Math.floor(base.tapDamage * (pct.tapDamage || 0));
      eff.maxHp += Math.floor(base.hp * (pct.hp || 0));
      eff.critChance += (pct.critChance || 0);
      eff.critMultiplier += (pct.critMultiplier || 0);
      eff.dodgeChance += (pct.dodgeChance || 0);
      if (pct.blockChance) eff.blockChance += pct.blockChance;
      if (pct.armor) eff.armor += Math.floor((eff.armor || 0) * pct.armor);
      if (pct.cooldownReduction) {
        const equipMul = 1 - eff.cooldownReduction / 100;
        const treeMul = 1 - pct.cooldownReduction;
        eff.cooldownReduction = (1 - equipMul * treeMul) * 100;
      }
      eff.arcaneCritChance += (pct.arcaneCritChance || 0) * 100;
      eff.arcaneCritMultiplier += (pct.arcaneCritMultiplier || 0) * 100;
    }

    // Arcane crit (class-based + equipment + tree)
    const classStats = statsAtLevel(char.classId, char.level);
    const effectiveArcaneCritChance = classStats.arcaneCritChance + eff.arcaneCritChance / 100;
    const effectiveArcaneCritMultiplier = classStats.arcaneCritMultiplier + eff.arcaneCritMultiplier / 100;

    return {
      character: {
        id: char.id,
        nickname: char.nickname,
        classId: char.classId,
        skinId: char.skinId,
        level: char.level,
        xp: char.xp,
        xpToNext: char.xpToNext,
        hp: char.hp,
        maxHp: eff.maxHp,
        tapDamage: eff.tapDamage,
        critChance: eff.critChance,
        critMultiplier: eff.critMultiplier,
        dodgeChance: eff.dodgeChance,
        armor: eff.armor,
        blockChance: eff.blockChance,
        cooldownReduction: eff.cooldownReduction,
        arcaneCritChance: effectiveArcaneCritChance,
        arcaneCritMultiplier: effectiveArcaneCritMultiplier,
        specialValue: char.specialValue,
        elementalDamage: char.elementalDamage,
        resistance: eff.resistance,
        dojoBestDamage: char.dojoBestDamage,
        endgameUnlocked: char.endgameUnlocked,
        completedBosses: char.completedBosses,
        highestTierCompleted: char.highestTierCompleted,
        totalMapsRun: char.totalMapsRun,
        allocatedNodes: char.allocatedNodes,
        equipment,
        leagueName: league?.name || 'Unknown',
        leagueType: league?.type || 'standard',
        telegramUsername: char.player?.telegramUsername || null,
      },
    };
  }
}
