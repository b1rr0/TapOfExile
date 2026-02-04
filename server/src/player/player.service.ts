import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '../shared/entities/player.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';

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
   * Get the player's active PlayerLeague (with characters + bag).
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
      relations: ['league', 'characters', 'characters.skillAllocations', 'bag'],
    });

    if (!pl) {
      throw new NotFoundException('Player not in active league');
    }

    return pl;
  }

  /**
   * Get full player state scoped to active league.
   */
  async getPlayerState(telegramId: string) {
    const player = await this.getPlayer(telegramId);
    const pl = await this.getActivePlayerLeague(telegramId);

    return {
      gold: pl.gold,
      activeLeagueId: player.activeLeagueId,
      activeCharacterId: pl.activeCharacterId,
      league: {
        id: pl.leagueId,
        name: pl.league?.name,
        type: pl.league?.type,
      },
      characters: (pl.characters || []).map((c) => ({
        id: c.id,
        nickname: c.nickname,
        classId: c.classId,
        skinId: c.skinId,
        createdAt: Number(c.createdAt),
        level: c.level,
        xp: Number(c.xp),
        xpToNext: Number(c.xpToNext),
        tapDamage: c.tapDamage,
        critChance: c.critChance,
        critMultiplier: c.critMultiplier,
        passiveDps: c.passiveDps,
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
          equipment: c.equipment,
        },
        endgame: {
          unlocked: c.endgameUnlocked,
          completedBosses: c.completedBosses,
          highestTierCompleted: c.highestTierCompleted,
          totalMapsRun: c.totalMapsRun,
        },
      })),
      // Bag is per-league (shared among all characters in the league)
      bag: (pl.bag || []).map((item) => ({
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
