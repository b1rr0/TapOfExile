import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Character } from '../shared/entities/character.entity';
import { Player } from '../shared/entities/player.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { League } from '../shared/entities/league.entity';
import { B } from '../shared/constants/balance.constants';
import { CLASS_DEFS, statsAtLevel, specialAtLevel } from '@shared/class-stats';
import { CreateCharacterDto } from './dto/create-character.dto';

@Injectable()
export class CharacterService {
  constructor(
    @InjectRepository(Character)
    private charRepo: Repository<Character>,
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
    @InjectRepository(PlayerLeague)
    private playerLeagueRepo: Repository<PlayerLeague>,
    @InjectRepository(League)
    private leagueRepo: Repository<League>,
  ) {}

  /**
   * Get the active PlayerLeague for the player.
   */
  private async getActivePlayerLeague(
    telegramId: string,
  ): Promise<PlayerLeague> {
    const player = await this.playerRepo.findOne({
      where: { telegramId },
    });
    if (!player) throw new NotFoundException('Player not found');
    if (!player.activeLeagueId) {
      throw new BadRequestException('No active league. Join a league first.');
    }

    const pl = await this.playerLeagueRepo.findOne({
      where: {
        playerTelegramId: telegramId,
        leagueId: player.activeLeagueId,
      },
    });
    if (!pl) throw new NotFoundException('Player not in active league');
    return pl;
  }

  /**
   * Get or create a PlayerLeague for a specific league.
   */
  private async getOrCreatePlayerLeague(
    telegramId: string,
    leagueId: string,
  ): Promise<PlayerLeague> {
    const league = await this.leagueRepo.findOne({ where: { id: leagueId } });
    if (!league) throw new NotFoundException('League not found');
    if (league.status !== 'active') {
      throw new BadRequestException('Cannot create character in inactive league');
    }

    let pl = await this.playerLeagueRepo.findOne({
      where: { playerTelegramId: telegramId, leagueId },
    });

    if (!pl) {
      pl = this.playerLeagueRepo.create({
        playerTelegramId: telegramId,
        leagueId,
        gold: '0',
        activeCharacterId: null,
      });
      pl = await this.playerLeagueRepo.save(pl);
    }

    return pl;
  }

  /**
   * List characters in the active league.
   */
  async listCharacters(telegramId: string): Promise<Character[]> {
    const pl = await this.getActivePlayerLeague(telegramId);
    return this.charRepo.find({
      where: { playerLeagueId: pl.id },
    });
  }

  async getCharacter(telegramId: string, charId: string): Promise<Character> {
    const char = await this.charRepo.findOne({
      where: { id: charId, playerTelegramId: telegramId },
    });
    if (!char) throw new NotFoundException('Character not found');
    return char;
  }

  /**
   * Create character in the specified or active league.
   * If leagueId is provided, auto-joins that league and switches to it.
   */
  async createCharacter(
    telegramId: string,
    dto: CreateCharacterDto,
  ): Promise<Character> {
    let pl: PlayerLeague;

    if (dto.leagueId) {
      // Create in specified league (join if needed)
      pl = await this.getOrCreatePlayerLeague(telegramId, dto.leagueId);

      // Switch player's active league to the chosen one
      const player = await this.playerRepo.findOne({ where: { telegramId } });
      if (player) {
        player.activeLeagueId = dto.leagueId;
        await this.playerRepo.save(player);
      }
    } else {
      pl = await this.getActivePlayerLeague(telegramId);
    }

    // Limit 10 characters per league
    const existing = await this.charRepo.count({
      where: { playerLeagueId: pl.id },
    });
    if (existing >= 10) {
      throw new BadRequestException('Maximum 10 characters per league');
    }

    const now = Date.now();
    const charId = `char_${now}_${Math.random().toString(36).slice(2, 6)}`;

    const classDef = CLASS_DEFS[dto.classId];
    const baseStats = statsAtLevel(dto.classId, 1);

    const char = this.charRepo.create({
      id: charId,
      playerTelegramId: telegramId,
      leagueId: pl.leagueId,
      playerLeagueId: pl.id,
      nickname: dto.nickname,
      classId: dto.classId,
      skinId: classDef?.skinId || 'samurai_1',
      createdAt: String(now),
      level: 1,
      xp: '0',
      xpToNext: String(B.XP_BASE),
      hp: baseStats.hp,
      maxHp: baseStats.hp,
      tapDamage: baseStats.tapDamage,
      critChance: baseStats.critChance,
      critMultiplier: baseStats.critMultiplier,
      dodgeChance: baseStats.dodgeChance,
      specialValue: specialAtLevel(dto.classId, 1),
      elementalDamage: { ...B.DEFAULT_ELEMENTAL_DAMAGE },
      resistance: { ...baseStats.resistance },
      combatCurrentStage: 1,
      combatCurrentWave: 1,
      combatWavesPerStage: 10,
      completedLocations: [],
      currentLocation: null,
      currentAct: 1,
      equipment: {},
      endgameUnlocked: false,
      completedBosses: [],
      highestTierCompleted: 0,
      totalMapsRun: 0,
    });

    await this.charRepo.save(char);

    // Auto-activate if first character in this league
    if (!pl.activeCharacterId) {
      pl.activeCharacterId = charId;
      await this.playerLeagueRepo.save(pl);
    }

    return char;
  }

  /**
   * Activate a character (sets activeCharacterId on PlayerLeague).
   * Also switches the player's active league if the character is in a different league.
   */
  async activateCharacter(
    telegramId: string,
    charId: string,
  ): Promise<Character> {
    const char = await this.getCharacter(telegramId, charId);
    const pl = await this.playerLeagueRepo.findOne({
      where: { id: char.playerLeagueId },
    });
    if (!pl) throw new NotFoundException('PlayerLeague not found');

    // Update active character in the PlayerLeague
    pl.activeCharacterId = char.id;
    await this.playerLeagueRepo.save(pl);

    // Switch player's active league to match the character's league
    const player = await this.playerRepo.findOne({ where: { telegramId } });
    if (player && player.activeLeagueId !== char.leagueId) {
      player.activeLeagueId = char.leagueId;
      await this.playerRepo.save(player);
    }

    return char;
  }

  async changeSkin(
    telegramId: string,
    charId: string,
    skinId: string,
  ): Promise<Character> {
    const char = await this.getCharacter(telegramId, charId);
    char.skinId = skinId;
    await this.charRepo.save(char);
    return char;
  }
}
