import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';

/**
 * Public leaderboard endpoints — no authentication required.
 * Used by the wiki site and other public-facing pages.
 */
@ApiTags('leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  /** Active leagues list (for league selector on wiki) */
  @Get('leagues')
  async getLeagues() {
    return this.leaderboardService.getActiveLeagues();
  }

  /** Top players by Dojo best damage, optionally filtered by league */
  @Get('dojo')
  async getDojoLeaderboard(
    @Query('limit') limit?: string,
    @Query('leagueId') leagueId?: string,
  ) {
    const n = Math.min(Math.max(parseInt(limit || '50', 10) || 50, 1), 100);
    return this.leaderboardService.getDojoLeaderboard(n, leagueId);
  }

  /** Top players by experience (level + xp), optionally filtered by league */
  @Get('xp')
  async getXpLeaderboard(
    @Query('limit') limit?: string,
    @Query('leagueId') leagueId?: string,
  ) {
    const n = Math.min(Math.max(parseInt(limit || '50', 10) || 50, 1), 100);
    return this.leaderboardService.getXpLeaderboard(n, leagueId);
  }

  /** Public character profile (stats, equipment, skill tree) */
  @Get('character/:id')
  async getCharacterProfile(@Param('id') id: string) {
    const result = await this.leaderboardService.getCharacterProfile(id);
    if (!result) throw new NotFoundException('Character not found');
    return result;
  }
}
