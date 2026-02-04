import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { RewardsService } from './rewards.service';

@ApiTags('rewards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rewards')
export class RewardsController {
  constructor(private rewardsService: RewardsService) {}

  @Get('daily')
  @ApiOperation({ summary: 'Get daily reward info' })
  async getDailyInfo(@CurrentUser('telegramId') telegramId: string) {
    return this.rewardsService.getDailyRewardInfo(telegramId);
  }

  @Post('daily/claim')
  @ApiOperation({ summary: 'Claim daily reward' })
  async claimDaily(@CurrentUser('telegramId') telegramId: string) {
    return this.rewardsService.claimDailyReward(telegramId);
  }

  @Get('achievements')
  @ApiOperation({ summary: 'Get achievements list' })
  async getAchievements() {
    return this.rewardsService.getAchievements();
  }
}
