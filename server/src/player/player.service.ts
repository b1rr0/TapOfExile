import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '../shared/entities/player.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';

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
      relations: ['playerLeagues'],
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
    const player = await this.getPlayer(telegramId);

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
   */
  async getPlayerState(telegramId: string) {
    const player = await this.getPlayer(telegramId);
    const pl = await this.getActivePlayerLeague(telegramId);
    const allPlayerLeagues = await this.getAllPlayerLeagues(telegramId);

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
        for (const slot of c.equipmentSlots || []) {
          if (slot.item) {
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
          hp: c.hp,
          maxHp: c.maxHp,
          tapDamage: c.tapDamage,
          critChance: c.critChance,
          critMultiplier: c.critMultiplier,
          dodgeChance: c.dodgeChance,
          specialValue: c.specialValue,
          resistance: c.resistance || {},
          elementalDamage: c.elementalDamage || { physical: 1.0 },
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
          dailyBonusRemaining,
        });
      }
    }

    return {
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
        })),
      meta: {
        lastSaveTime: Number(player.lastSaveTime),
        totalTaps: Number(player.totalTaps),
        totalKills: Number(player.totalKills),
        totalGold: Number(player.totalGold),
        version: player.gameVersion,
      },
    };
  }

  /**
   * Update gold on the active league's PlayerLeague entry.
   */
  async updateGold(telegramId: string, amount: number): Promise<string> {
    const pl = await this.getActivePlayerLeague(telegramId);
    const newGold = BigInt(pl.gold) + BigInt(amount);
    pl.gold = String(newGold < 0n ? 0n : newGold);
    await this.playerLeagueRepo.save(pl);

    // Also update player lastSaveTime
    const player = await this.getPlayer(telegramId);
    player.lastSaveTime = String(Date.now());
    await this.playerRepo.save(player);

    return pl.gold;
  }

  /**
   * Update global lifetime meta-stats (across all leagues).
   */
  async updateMeta(
    telegramId: string,
    taps: number,
    kills: number,
    gold: number,
  ): Promise<void> {
    const player = await this.getPlayer(telegramId);
    player.totalTaps = String(BigInt(player.totalTaps) + BigInt(taps));
    player.totalKills = String(BigInt(player.totalKills) + BigInt(kills));
    player.totalGold = String(BigInt(player.totalGold) + BigInt(gold));
    player.lastSaveTime = String(Date.now());
    await this.playerRepo.save(player);
  }

}
