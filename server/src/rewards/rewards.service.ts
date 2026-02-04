import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyReward } from '../shared/entities/daily-reward.entity';
import { Player } from '../shared/entities/player.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { RedisService } from '../redis/redis.service';
import { DAILY_REWARD_TABLE, ACHIEVEMENTS } from './reward-definitions';

interface DailyStreak {
  day: number;
  lastClaimTime: number;
}

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(DailyReward)
    private dailyRepo: Repository<DailyReward>,
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
    @InjectRepository(PlayerLeague)
    private playerLeagueRepo: Repository<PlayerLeague>,
    private redis: RedisService,
  ) {}

  /**
   * Get current daily reward info.
   */
  async getDailyRewardInfo(telegramId: string) {
    const streak = await this.getStreak(telegramId);
    const now = Date.now();
    const hoursSinceLastClaim = streak.lastClaimTime
      ? (now - streak.lastClaimTime) / (1000 * 60 * 60)
      : 999;

    const canClaim = hoursSinceLastClaim >= 24;
    const currentDay = canClaim ? streak.day : streak.day;
    const rewardIndex = ((currentDay - 1) % 30);
    const reward = DAILY_REWARD_TABLE[rewardIndex];

    return {
      day: currentDay,
      streak: streak.day,
      canClaim,
      hoursUntilClaim: canClaim ? 0 : Math.max(0, 24 - hoursSinceLastClaim),
      reward: reward || DAILY_REWARD_TABLE[0],
    };
  }

  /**
   * Claim daily reward. Gold goes to the active league's PlayerLeague.
   */
  async claimDailyReward(telegramId: string) {
    const streak = await this.getStreak(telegramId);
    const now = Date.now();
    const hoursSinceLastClaim = streak.lastClaimTime
      ? (now - streak.lastClaimTime) / (1000 * 60 * 60)
      : 999;

    if (hoursSinceLastClaim < 24) {
      throw new BadRequestException('Daily reward not ready yet');
    }

    // Check if streak is broken (> 48h since last claim)
    let newDay = streak.day;
    if (hoursSinceLastClaim > 48) {
      newDay = 1; // Reset streak
    }

    const rewardIndex = ((newDay - 1) % 30);
    const reward = DAILY_REWARD_TABLE[rewardIndex] || DAILY_REWARD_TABLE[0];

    // Get active league
    const player = await this.playerRepo.findOne({
      where: { telegramId },
    });
    if (!player) throw new NotFoundException('Player not found');

    const leagueId = player.activeLeagueId || null;

    // Save claim record
    const record = this.dailyRepo.create({
      playerTelegramId: telegramId,
      leagueId,
      day: newDay,
      rewardType: reward.type,
      rewardData: reward.data,
    });
    await this.dailyRepo.save(record);

    // Apply reward (gold → PlayerLeague)
    if (reward.type === 'gold' && reward.data.amount && leagueId) {
      const pl = await this.playerLeagueRepo.findOne({
        where: {
          playerTelegramId: telegramId,
          leagueId,
        },
      });
      if (pl) {
        pl.gold = String(
          BigInt(pl.gold) + BigInt(reward.data.amount),
        );
        await this.playerLeagueRepo.save(pl);
      }
    }

    // Update streak
    const nextDay = newDay + 1;
    await this.setStreak(telegramId, {
      day: nextDay > 30 ? 1 : nextDay,
      lastClaimTime: now,
    });

    return {
      claimed: reward,
      nextDay: nextDay > 30 ? 1 : nextDay,
      streak: newDay,
    };
  }

  /**
   * Get achievements list (future).
   */
  async getAchievements() {
    return ACHIEVEMENTS;
  }

  private async getStreak(telegramId: string): Promise<DailyStreak> {
    const data = await this.redis.getJson<DailyStreak>(
      `daily:streak:${telegramId}`,
    );
    return data || { day: 1, lastClaimTime: 0 };
  }

  private async setStreak(telegramId: string, streak: DailyStreak) {
    // TTL of 49 days to keep streak data around
    await this.redis.setJson(
      `daily:streak:${telegramId}`,
      streak,
      49 * 24 * 3600,
    );
  }
}
