import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '../shared/entities/player.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';

const OFFLINE_MAX_SECONDS = 28800; // 8 hours
const OFFLINE_MIN_SECONDS = 60;
const OFFLINE_DPS_RATE = 0.5;

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
      relations: ['league', 'characters', 'bag'],
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
        leagueId: c.leagueId,
        leagueName: pl.league?.name || 'Unknown',
        leagueType: pl.league?.type || 'standard',
        createdAt: Number(c.createdAt),
        level: c.level,
        xp: Number(c.xp),
        xpToNext: Number(c.xpToNext),
        tapDamage: c.tapDamage,
        critChance: c.critChance,
        critMultiplier: c.critMultiplier,
        dodgeChance: c.dodgeChance,
        specialValue: c.specialValue,
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
        allocatedNodes: c.allocatedNodes || [],
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

  /**
   * Calculate and claim offline gold.
   * Uses lastSaveTime to determine elapsed time, active character's tapDamage.
   */
  async claimOfflineGold(telegramId: string) {
    const player = await this.getPlayer(telegramId);
    const pl = await this.getActivePlayerLeague(telegramId);

    if (!pl.activeCharacterId) {
      return { offlineGold: 0, seconds: 0 };
    }

    // Find active character to get tapDamage for offline earnings
    const char = (pl.characters || []).find(
      (c) => c.id === pl.activeCharacterId,
    );
    if (!char || char.tapDamage <= 0) {
      return { offlineGold: 0, seconds: 0 };
    }

    const now = Date.now();
    const elapsed = (now - Number(player.lastSaveTime)) / 1000;
    const seconds = Math.min(elapsed, OFFLINE_MAX_SECONDS);

    if (seconds < OFFLINE_MIN_SECONDS) {
      return { offlineGold: 0, seconds: 0 };
    }

    const offlineGold = Math.floor(char.tapDamage * seconds * OFFLINE_DPS_RATE);
    if (offlineGold <= 0) {
      return { offlineGold: 0, seconds: 0 };
    }

    // Award the gold
    pl.gold = String(BigInt(pl.gold) + BigInt(offlineGold));
    await this.playerLeagueRepo.save(pl);

    // Update lastSaveTime
    player.lastSaveTime = String(now);
    player.totalGold = String(BigInt(player.totalGold) + BigInt(offlineGold));
    await this.playerRepo.save(player);

    return { offlineGold, seconds: Math.floor(seconds), gold: pl.gold };
  }
}
