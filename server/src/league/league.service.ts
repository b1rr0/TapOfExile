import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { League } from '../shared/entities/league.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { Player } from '../shared/entities/player.entity';

export const JP_MONTH_NAMES = [
  'Ichigatsu', 'Nigatsu', 'Sangatsu', 'Shigatsu',
  'Gogatsu', 'Rokugatsu', 'Shichigatsu', 'Hachigatsu',
  'Kugatsu', 'Juugatsu', 'Juuichigatsu', 'Juunigatsu',
];

@Injectable()
export class LeagueService implements OnModuleInit {
  private readonly logger = new Logger(LeagueService.name);

  constructor(
    @InjectRepository(League)
    private leagueRepo: Repository<League>,
    @InjectRepository(PlayerLeague)
    private playerLeagueRepo: Repository<PlayerLeague>,
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
  ) {}

  /**
   * Seed Standard league + current monthly league on first boot.
   */
  async onModuleInit() {
    const standardExists = await this.leagueRepo.findOne({
      where: { type: 'standard' },
    });
    if (!standardExists) {
      const standard = this.leagueRepo.create({
        name: 'Standard',
        type: 'standard',
        status: 'active',
        startsAt: new Date(),
        endsAt: null,
      });
      await this.leagueRepo.save(standard);
      this.logger.log(`Standard league created: ${standard.id}`);
    }

    // Auto-create monthly league for current month if none exists
    const monthlyExists = await this.getActiveMonthlyLeague();
    if (!monthlyExists) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23, 59, 59,
      );
      const leagueName = `${JP_MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

      const monthly = this.leagueRepo.create({
        name: leagueName,
        type: 'monthly',
        status: 'active',
        startsAt: monthStart,
        endsAt: monthEnd,
      });
      await this.leagueRepo.save(monthly);
      this.logger.log(`Monthly league created: "${leagueName}" (${monthly.id})`);
    }
  }

  /**
   * Get all active leagues.
   */
  async getActiveLeagues(): Promise<League[]> {
    return this.leagueRepo.find({
      where: { status: 'active' },
      order: { type: 'ASC', startsAt: 'DESC' },
    });
  }

  /**
   * Get ALL leagues (admin - includes completed/migrating).
   */
  async getAllLeagues(): Promise<League[]> {
    return this.leagueRepo.find({
      order: { startsAt: 'DESC' },
    });
  }

  /**
   * Get a league by ID.
   */
  async getLeague(leagueId: string): Promise<League> {
    const league = await this.leagueRepo.findOne({ where: { id: leagueId } });
    if (!league) throw new NotFoundException('League not found');
    return league;
  }

  /**
   * Get the Standard league (always exists).
   */
  async getStandardLeague(): Promise<League> {
    const league = await this.leagueRepo.findOne({
      where: { type: 'standard', status: 'active' },
    });
    if (!league) throw new NotFoundException('Standard league not found');
    return league;
  }

  /**
   * Get the current active monthly league (or null).
   */
  async getActiveMonthlyLeague(): Promise<League | null> {
    return this.leagueRepo.findOne({
      where: { type: 'monthly', status: 'active' },
    });
  }

  /**
   * Get leagues the player has joined.
   */
  async getPlayerLeagues(telegramId: string): Promise<PlayerLeague[]> {
    return this.playerLeagueRepo.find({
      where: { playerTelegramId: telegramId },
      relations: ['league'],
      order: { joinedAt: 'DESC' },
    });
  }

  /**
   * Get a specific PlayerLeague entry.
   */
  async getPlayerLeague(
    telegramId: string,
    leagueId: string,
  ): Promise<PlayerLeague> {
    const pl = await this.playerLeagueRepo.findOne({
      where: { playerTelegramId: telegramId, leagueId },
      relations: ['league', 'characters', 'bag'],
    });
    if (!pl) throw new NotFoundException('Player not in this league');
    return pl;
  }

  /**
   * Get the player's active league participation.
   */
  async getActivePlayerLeague(telegramId: string): Promise<PlayerLeague> {
    const player = await this.playerRepo.findOne({
      where: { telegramId },
    });
    if (!player) throw new NotFoundException('Player not found');

    if (!player.activeLeagueId) {
      // Auto-join Standard league if no active league
      const standard = await this.getStandardLeague();
      const pl = await this.joinLeague(telegramId, standard.id);
      player.activeLeagueId = standard.id;
      await this.playerRepo.save(player);
      return pl;
    }

    return this.getPlayerLeague(telegramId, player.activeLeagueId);
  }

  /**
   * Join a league (creates PlayerLeague with gold=0).
   */
  async joinLeague(
    telegramId: string,
    leagueId: string,
  ): Promise<PlayerLeague> {
    const league = await this.getLeague(leagueId);
    if (league.status !== 'active') {
      throw new BadRequestException('Cannot join inactive league');
    }

    // Check if already joined
    const existing = await this.playerLeagueRepo.findOne({
      where: { playerTelegramId: telegramId, leagueId },
      relations: ['league'],
    });
    if (existing) return existing;

    const pl = this.playerLeagueRepo.create({
      playerTelegramId: telegramId,
      leagueId,
      gold: '0',
      activeCharacterId: null,
    });

    const saved = await this.playerLeagueRepo.save(pl);

    // Auto-set as active league if player has no active league
    const player = await this.playerRepo.findOne({
      where: { telegramId },
    });
    if (player && !player.activeLeagueId) {
      player.activeLeagueId = leagueId;
      await this.playerRepo.save(player);
    }

    return this.playerLeagueRepo.findOne({
      where: { id: saved.id },
      relations: ['league'],
    }) as Promise<PlayerLeague>;
  }

  /**
   * Switch the player's active league.
   */
  async switchLeague(
    telegramId: string,
    leagueId: string,
  ): Promise<PlayerLeague> {
    // Verify player has joined this league
    const pl = await this.getPlayerLeague(telegramId, leagueId);

    const player = await this.playerRepo.findOne({
      where: { telegramId },
    });
    if (!player) throw new NotFoundException('Player not found');

    player.activeLeagueId = leagueId;
    await this.playerRepo.save(player);

    return pl;
  }

  /**
   * Create a new monthly league. Called by CRON or admin.
   */
  async createMonthlyLeague(
    name: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<League> {
    // Ensure no active monthly league exists
    const existing = await this.getActiveMonthlyLeague();
    if (existing) {
      throw new BadRequestException(
        'Active monthly league already exists. Complete it before creating a new one.',
      );
    }

    const league = this.leagueRepo.create({
      name,
      type: 'monthly',
      status: 'active',
      startsAt,
      endsAt,
    });

    return this.leagueRepo.save(league);
  }

  /**
   * Update league status (used by migration service).
   */
  async updateLeagueStatus(
    leagueId: string,
    status: string,
  ): Promise<League> {
    const league = await this.getLeague(leagueId);
    league.status = status;
    return this.leagueRepo.save(league);
  }

  /**
   * Get all PlayerLeague entries for a specific league.
   */
  async getAllPlayerLeaguesForLeague(
    leagueId: string,
  ): Promise<PlayerLeague[]> {
    return this.playerLeagueRepo.find({
      where: { leagueId },
      relations: ['characters', 'bag'],
    });
  }

  /**
   * Find or create a PlayerLeague entry.
   */
  async findOrCreatePlayerLeague(
    telegramId: string,
    leagueId: string,
  ): Promise<PlayerLeague> {
    const existing = await this.playerLeagueRepo.findOne({
      where: { playerTelegramId: telegramId, leagueId },
    });
    if (existing) return existing;

    const pl = this.playerLeagueRepo.create({
      playerTelegramId: telegramId,
      leagueId,
      gold: '0',
      activeCharacterId: null,
    });
    return this.playerLeagueRepo.save(pl);
  }

  /**
   * Update gold on a PlayerLeague entry.
   */
  async updatePlayerLeagueGold(
    playerLeagueId: string,
    amount: bigint,
  ): Promise<string> {
    const pl = await this.playerLeagueRepo.findOne({
      where: { id: playerLeagueId },
    });
    if (!pl) throw new NotFoundException('PlayerLeague not found');

    const newGold = BigInt(pl.gold) + amount;
    pl.gold = String(newGold < 0n ? 0n : newGold);
    await this.playerLeagueRepo.save(pl);
    return pl.gold;
  }
}
