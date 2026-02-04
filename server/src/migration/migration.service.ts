import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '../shared/entities/player.entity';
import { Character } from '../shared/entities/character.entity';
import { BagItem } from '../shared/entities/bag-item.entity';
import { League } from '../shared/entities/league.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { B } from '../shared/constants/balance.constants';

const VALID_CLASS_IDS = ['samurai', 'warrior', 'mage', 'archer'];

@Injectable()
export class MigrationService {
  constructor(
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
    @InjectRepository(Character)
    private charRepo: Repository<Character>,
    @InjectRepository(BagItem)
    private bagRepo: Repository<BagItem>,
    @InjectRepository(League)
    private leagueRepo: Repository<League>,
    @InjectRepository(PlayerLeague)
    private playerLeagueRepo: Repository<PlayerLeague>,
  ) {}

  /**
   * Get the Standard league for importing.
   */
  private async getStandardLeague(): Promise<League> {
    const league = await this.leagueRepo.findOne({
      where: { type: 'standard', status: 'active' },
    });
    if (!league) {
      throw new BadRequestException(
        'Standard league not found. Server may not be fully initialized.',
      );
    }
    return league;
  }

  /**
   * Find or create a PlayerLeague entry for Standard.
   */
  private async findOrCreateStandardPlayerLeague(
    telegramId: string,
    standardLeagueId: string,
  ): Promise<PlayerLeague> {
    let pl = await this.playerLeagueRepo.findOne({
      where: {
        playerTelegramId: telegramId,
        leagueId: standardLeagueId,
      },
    });

    if (!pl) {
      pl = this.playerLeagueRepo.create({
        playerTelegramId: telegramId,
        leagueId: standardLeagueId,
        gold: '0',
        activeCharacterId: null,
      });
      pl = await this.playerLeagueRepo.save(pl);
    }

    return pl;
  }

  /**
   * Import a client localStorage save to the server database.
   * All data goes into the Standard league.
   */
  async importLocalSave(telegramId: string, gameData: any) {
    // Basic validation
    if (!gameData || typeof gameData !== 'object') {
      throw new BadRequestException('Invalid gameData format');
    }

    // Apply migrations if needed
    const migrated = this.migrateData(gameData);

    // Validate migrated data
    this.validateGameData(migrated);

    // Get Standard league
    const standard = await this.getStandardLeague();

    // Find or create player
    let player = await this.playerRepo.findOne({
      where: { telegramId },
    });

    if (!player) {
      player = this.playerRepo.create({
        telegramId,
        activeLeagueId: standard.id,
        totalTaps: String(migrated.meta?.totalTaps || 0),
        totalKills: String(migrated.meta?.totalKills || 0),
        totalGold: String(migrated.meta?.totalGold || 0),
        gameVersion: migrated.meta?.version || 4,
        lastSaveTime: String(migrated.meta?.lastSaveTime || Date.now()),
      });
    } else {
      // Compare timestamps: keep newer version
      const serverTime = Number(player.lastSaveTime);
      const clientTime = migrated.meta?.lastSaveTime || 0;

      if (clientTime <= serverTime) {
        return {
          status: 'skipped',
          reason: 'Server data is newer',
          serverTime,
          clientTime,
        };
      }

      player.totalTaps = String(migrated.meta?.totalTaps || 0);
      player.totalKills = String(migrated.meta?.totalKills || 0);
      player.totalGold = String(migrated.meta?.totalGold || 0);
      player.gameVersion = migrated.meta?.version || 4;
      player.lastSaveTime = String(migrated.meta?.lastSaveTime || Date.now());
      if (!player.activeLeagueId) {
        player.activeLeagueId = standard.id;
      }
    }

    await this.playerRepo.save(player);

    // Find or create PlayerLeague for Standard
    const pl = await this.findOrCreateStandardPlayerLeague(
      telegramId,
      standard.id,
    );

    // Set gold on the PlayerLeague
    pl.gold = String(migrated.gold || 0);

    // Import characters
    const characters = migrated.characters || [];
    let importedChars = 0;
    let firstCharId: string | null = null;

    for (const charData of characters) {
      if (!charData.id) continue;

      let char = await this.charRepo.findOne({
        where: { id: charData.id },
      });

      const charValues = {
        playerTelegramId: telegramId,
        leagueId: standard.id,
        playerLeagueId: pl.id,
        nickname: charData.nickname || 'Hero',
        classId: charData.classId || 'samurai',
        skinId: charData.skinId || 'samurai_1',
        createdAt: String(charData.createdAt || Date.now()),
        level: charData.level || 1,
        xp: String(charData.xp || 0),
        xpToNext: String(charData.xpToNext || B.XP_BASE),
        tapDamage: charData.tapDamage || B.STARTING_STATS.tapDamage,
        critChance: charData.critChance || B.STARTING_STATS.critChance,
        critMultiplier: charData.critMultiplier || B.STARTING_STATS.critMultiplier,
        passiveDps: charData.passiveDps || B.STARTING_STATS.passiveDps,
        combatCurrentStage: charData.combat?.currentStage || 1,
        combatCurrentWave: charData.combat?.currentWave || 1,
        combatWavesPerStage: charData.combat?.wavesPerStage || 10,
        completedLocations: charData.locations?.completed || [],
        currentLocation: charData.locations?.current || null,
        currentAct: charData.locations?.currentAct || 1,
        equipment: charData.inventory?.equipment || {},
        endgameUnlocked: charData.endgame?.unlocked || false,
        completedBosses: charData.endgame?.completedBosses || [],
        highestTierCompleted: charData.endgame?.highestTierCompleted || 0,
        totalMapsRun: charData.endgame?.totalMapsRun || 0,
      };

      if (char) {
        Object.assign(char, charValues);
      } else {
        char = this.charRepo.create({ id: charData.id, ...charValues });
      }

      await this.charRepo.save(char);

      if (!firstCharId) firstCharId = charData.id;

      // Import bag items → now tied to PlayerLeague, not character
      if (charData.bag && Array.isArray(charData.bag)) {
        for (const itemData of charData.bag.slice(0, 32)) {
          if (!itemData.id) continue;

          // Check if item already exists
          const existingItem = await this.bagRepo.findOne({
            where: { id: itemData.id },
          });
          if (existingItem) continue;

          const item = this.bagRepo.create({
            id: itemData.id,
            playerLeagueId: pl.id,
            name: itemData.name || '',
            type: itemData.type || 'map_key',
            quality: itemData.quality || 'common',
            level: itemData.level || null,
            icon: itemData.icon || null,
            acquiredAt: String(itemData.acquiredAt || Date.now()),
            tier: itemData.tier || null,
            locationId: itemData.locationId || null,
            locationAct: itemData.locationAct || null,
            bossId: itemData.bossId || null,
            bossKeyTier: itemData.bossKeyTier || null,
          });
          await this.bagRepo.save(item);
        }
      }

      importedChars++;
    }

    // Set active character on PlayerLeague
    if (migrated.activeCharacterId) {
      pl.activeCharacterId = migrated.activeCharacterId;
    } else if (firstCharId) {
      pl.activeCharacterId = firstCharId;
    }
    await this.playerLeagueRepo.save(pl);

    return {
      status: 'imported',
      leagueId: standard.id,
      charactersImported: importedChars,
      gold: pl.gold,
      version: player.gameVersion,
    };
  }

  /**
   * Apply data migrations (V1→V2→V3→V4).
   * Mirrored from bot/src/game/state.ts
   */
  private migrateData(data: any): any {
    let d = { ...data };

    // V1→V2: single player to multi-character
    if (d.player && !d.characters) {
      const p = d.player;
      const charId = `char_migrated_${Date.now()}`;
      d = {
        gold: p.gold || 0,
        activeCharacterId: charId,
        characters: [
          {
            id: charId,
            nickname: 'Hero',
            classId: 'samurai',
            skinId: p.skinId || 'samurai_1',
            createdAt: Date.now(),
            level: p.level || 1,
            xp: p.xp || 0,
            xpToNext: p.xpToNext || 100,
            tapDamage: p.tapDamage || 1,
            critChance: p.critChance || 0.05,
            critMultiplier: p.critMultiplier || 2.0,
            passiveDps: p.passiveDps || 0,
            combat: d.combat || { currentStage: 1, currentWave: 1, wavesPerStage: 10 },
            locations: d.locations || { completed: [], current: null, currentAct: 1 },
            inventory: d.inventory || { items: [], equipment: {} },
            bag: [],
            endgame: { unlocked: false, completedBosses: [], highestTierCompleted: 0, totalMapsRun: 0 },
          },
        ],
        meta: d.meta || { lastSaveTime: Date.now(), totalTaps: 0, totalKills: 0, totalGold: 0, version: 2 },
      };
    }

    // V2→V3: add act prefixes to location IDs
    if (d.meta && d.meta.version < 3) {
      for (const char of (d.characters || [])) {
        if (char.locations) {
          char.locations.completed = (char.locations.completed || []).map(
            (id: string) => (id.startsWith('act') ? id : `act1_${id}`),
          );
          char.locations.currentAct = char.locations.currentAct || 1;
        }
      }
      d.meta.version = 3;
    }

    // V3→V4: add endgame + bag
    if (d.meta && d.meta.version < 4) {
      for (const char of (d.characters || [])) {
        if (!char.endgame) {
          char.endgame = {
            unlocked: false,
            completedBosses: [],
            highestTierCompleted: 0,
            totalMapsRun: 0,
          };
        }
        if (!char.bag) char.bag = [];
      }
      d.meta.version = 4;
    }

    return d;
  }

  /**
   * Validate migrated data structure.
   */
  private validateGameData(data: any) {
    if (typeof data.gold !== 'number' || data.gold < 0) {
      throw new BadRequestException('Invalid gold value');
    }

    for (const char of (data.characters || [])) {
      if (!char.id) {
        throw new BadRequestException('Character missing ID');
      }
      if (char.classId && !VALID_CLASS_IDS.includes(char.classId)) {
        throw new BadRequestException(`Invalid classId: ${char.classId}`);
      }
      if (char.level < 1 || char.level > 9999) {
        throw new BadRequestException(`Invalid level: ${char.level}`);
      }
    }
  }
}
