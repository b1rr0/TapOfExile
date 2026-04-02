import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { League } from '../shared/entities/league.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { Character } from '../shared/entities/character.entity';
import { Item } from '../shared/entities/item.entity';
import { Player } from '../shared/entities/player.entity';
import { LeagueService, JP_MONTH_NAMES } from './league.service';
import {
  LeagueTransferResult,
  LeagueTransferPlayerResult,
} from './interfaces/league-transfer.interface';

@Injectable()
export class LeagueMigrationService implements OnModuleInit {
  private readonly logger = new Logger(LeagueMigrationService.name);

  constructor(
    @InjectRepository(League)
    private leagueRepo: Repository<League>,
    @InjectRepository(PlayerLeague)
    private playerLeagueRepo: Repository<PlayerLeague>,
    @InjectRepository(Character)
    private charRepo: Repository<Character>,
    @InjectRepository(Item)
    private itemRepo: Repository<Item>,
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
    private leagueService: LeagueService,
    private dataSource: DataSource,
  ) {}

  /**
   * On startup: check if the active monthly league has expired.
   * Handles the case where the CRON job was missed (server was down on 1st).
   */
  async onModuleInit() {
    const monthlyLeague = await this.leagueService.getActiveMonthlyLeague();
    if (!monthlyLeague) return;

    if (monthlyLeague.endsAt && monthlyLeague.endsAt < new Date()) {
      this.logger.warn(
        `Expired monthly league detected on startup: "${monthlyLeague.name}" (ended ${monthlyLeague.endsAt.toISOString()}). Running migration...`,
      );
      await this.handleMonthlyMigration();
    }
  }

  /**
   * CRON job: runs at 00:00 UTC on the 1st of every month.
   * Migrates all monthly league data into Standard.
   */
  @Cron('0 0 1 * *', { name: 'monthly-league-migration' })
  async handleMonthlyMigration() {
    this.logger.log('Starting monthly league migration...');

    const monthlyLeague = await this.leagueService.getActiveMonthlyLeague();
    if (!monthlyLeague) {
      this.logger.log('No active monthly league found. Skipping migration.');
      return;
    }

    // Check if league end date has passed
    if (monthlyLeague.endsAt && monthlyLeague.endsAt > new Date()) {
      this.logger.log(
        `Monthly league "${monthlyLeague.name}" has not ended yet (ends: ${monthlyLeague.endsAt.toISOString()}).`,
      );
      return;
    }

    try {
      const result = await this.migrateLeague(monthlyLeague.id);
      this.logger.log(
        `Migration complete: ${result.playersTransferred} players, ` +
          `${result.charactersTransferred} characters, ` +
          `${result.itemsTransferred} items transferred.`,
      );

      // Create league for the current month (handles both CRON on 1st and late startup)
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
      );

      const leagueName = `${JP_MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

      await this.leagueService.createMonthlyLeague(
        leagueName,
        currentMonthStart,
        currentMonthEnd,
      );
      this.logger.log(`New monthly league created: "${leagueName}"`);
    } catch (error) {
      this.logger.error('Monthly migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate all data from a monthly league to Standard.
   * Uses a transaction for data integrity.
   */
  async migrateLeague(monthlyLeagueId: string): Promise<LeagueTransferResult> {
    const standard = await this.leagueService.getStandardLeague();
    const monthlyLeague = await this.leagueService.getLeague(monthlyLeagueId);

    if (monthlyLeague.type !== 'monthly') {
      throw new Error('Can only migrate monthly leagues');
    }

    // Mark as migrating
    await this.leagueService.updateLeagueStatus(monthlyLeagueId, 'migrating');

    const allPlayerLeagues =
      await this.leagueService.getAllPlayerLeaguesForLeague(monthlyLeagueId);

    let totalCharacters = 0;
    let totalItems = 0;
    let totalGold = 0n;
    const playerResults: LeagueTransferPlayerResult[] = [];

    // Run in transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const monthlyPl of allPlayerLeagues) {
        const result = await this.transferPlayerData(
          queryRunner,
          monthlyPl,
          standard.id,
        );
        playerResults.push(result);
        totalCharacters += result.charactersMoved;
        totalItems += result.itemsMoved;
        totalGold += BigInt(result.goldMerged);
      }

      // Mark monthly league as completed
      await queryRunner.manager.update(League, monthlyLeagueId, {
        status: 'completed',
      });

      // Switch players who had this as active league to Standard
      await queryRunner.manager
        .createQueryBuilder()
        .update(Player)
        .set({ activeLeagueId: standard.id })
        .where('activeLeagueId = :monthlyId', {
          monthlyId: monthlyLeagueId,
        })
        .execute();

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      // Revert league status
      await this.leagueService.updateLeagueStatus(
        monthlyLeagueId,
        'active',
      );
      throw error;
    } finally {
      await queryRunner.release();
    }

    return {
      playersTransferred: playerResults.length,
      charactersTransferred: totalCharacters,
      itemsTransferred: totalItems,
      goldTransferred: totalGold,
      sourceLeagueId: monthlyLeagueId,
      targetLeagueId: standard.id,
    };
  }

  /**
   * Transfer a single player's data from monthly to standard.
   */
  private async transferPlayerData(
    queryRunner: import('typeorm').QueryRunner,
    monthlyPl: PlayerLeague,
    standardLeagueId: string,
  ): Promise<LeagueTransferPlayerResult> {
    const telegramId = monthlyPl.playerTelegramId;

    // Find or create Standard PlayerLeague
    let standardPl = await queryRunner.manager.findOne(PlayerLeague, {
      where: {
        playerTelegramId: telegramId,
        leagueId: standardLeagueId,
      },
    });

    if (!standardPl) {
      standardPl = queryRunner.manager.create(PlayerLeague, {
        playerTelegramId: telegramId,
        leagueId: standardLeagueId,
        gold: '0',
        activeCharacterId: null,
      });
      standardPl = await queryRunner.manager.save(PlayerLeague, standardPl);
    }

    // Merge gold
    const mergedGold = BigInt(standardPl.gold) + BigInt(monthlyPl.gold);
    await queryRunner.manager.update(PlayerLeague, standardPl.id, {
      gold: String(mergedGold),
    });

    // Transfer characters
    const charCount = await queryRunner.manager.count(Character, {
      where: { playerLeagueId: monthlyPl.id },
    });
    await queryRunner.manager
      .createQueryBuilder()
      .update(Character)
      .set({
        leagueId: standardLeagueId,
        playerLeagueId: standardPl.id,
      })
      .where('playerLeagueId = :plId', { plId: monthlyPl.id })
      .execute();

    // Transfer items
    const itemCount = await queryRunner.manager.count(Item, {
      where: { playerLeagueId: monthlyPl.id },
    });
    await queryRunner.manager
      .createQueryBuilder()
      .update(Item)
      .set({ playerLeagueId: standardPl.id })
      .where('playerLeagueId = :plId', { plId: monthlyPl.id })
      .execute();

    // Remove empty monthly PlayerLeague
    await queryRunner.manager.delete(PlayerLeague, monthlyPl.id);

    return {
      telegramId,
      goldMerged: String(monthlyPl.gold),
      charactersMoved: charCount,
      itemsMoved: itemCount,
    };
  }

  /**
   * Manual trigger for league migration (admin/debug).
   */
  async triggerMigration(
    leagueId: string,
  ): Promise<LeagueTransferResult> {
    return this.migrateLeague(leagueId);
  }
}
