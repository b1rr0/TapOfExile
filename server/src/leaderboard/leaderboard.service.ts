import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DojoRecord } from '../shared/entities/dojo-record.entity';
import { Character } from '../shared/entities/character.entity';
import { League } from '../shared/entities/league.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(DojoRecord)
    private dojoRecordRepo: Repository<DojoRecord>,
    @InjectRepository(Character)
    private characterRepo: Repository<Character>,
    @InjectRepository(League)
    private leagueRepo: Repository<League>,
  ) {}

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
   * If leagueId is provided, filter dojo records to characters in that league.
   */
  async getDojoLeaderboard(limit = 50, leagueId?: string) {
    if (leagueId) {
      // JOIN with characters table to filter by league
      const records = await this.dojoRecordRepo
        .createQueryBuilder('d')
        .innerJoin(Character, 'c', 'c.id = d.characterId')
        .where('c.leagueId = :leagueId', { leagueId })
        .orderBy('d.bestDamage', 'DESC')
        .take(limit)
        .getMany();

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

    // No league filter — global leaderboard
    const records = await this.dojoRecordRepo.find({
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
        maxHp: char.maxHp,
        tapDamage: char.tapDamage,
        critChance: char.critChance,
        critMultiplier: char.critMultiplier,
        dodgeChance: char.dodgeChance,
        specialValue: char.specialValue,
        elementalDamage: char.elementalDamage,
        resistance: char.resistance,
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
