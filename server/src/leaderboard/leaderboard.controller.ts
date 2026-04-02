import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';

/**
 * Public leaderboard endpoints - no authentication required.
 * Used by the wiki site and other public-facing pages.
 */
@ApiTags('leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get('online')
  @ApiOperation({ summary: 'Online player count per league (last seen < 60s)' })
  @ApiResponse({ status: 200, description: 'Online counts per active league + total' })
  async getOnline() {
    return this.leaderboardService.getOnlineByLeague();
  }

  @Get('leagues')
  @ApiOperation({ summary: 'Get active leagues for leaderboard filtering' })
  @ApiResponse({ status: 200, description: 'Active leagues list' })
  async getLeagues() {
    return this.leaderboardService.getActiveLeagues();
  }

  @Get('dojo')
  @ApiOperation({ summary: 'Top players by Dojo best damage' })
  @ApiResponse({ status: 200, description: 'Ranked dojo leaderboard' })
  async getDojoLeaderboard(@Query() query: LeaderboardQueryDto) {
    return this.leaderboardService.getDojoLeaderboard(query.limit, query.leagueId);
  }

  @Get('xp')
  @ApiOperation({ summary: 'Top players by experience (level + xp)' })
  @ApiResponse({ status: 200, description: 'Ranked XP leaderboard' })
  async getXpLeaderboard(@Query() query: LeaderboardQueryDto) {
    return this.leaderboardService.getXpLeaderboard(query.limit, query.leagueId);
  }

  @Get('character/:id')
  @ApiOperation({ summary: 'Public character profile' })
  @ApiResponse({ status: 200, description: 'Character profile with stats and equipment' })
  @ApiResponse({ status: 404, description: 'Character not found' })
  async getCharacterProfile(@Param('id') id: string) {
    const result = await this.leaderboardService.getCharacterProfile(id);
    if (!result) throw new NotFoundException('Character not found');
    return result;
  }
}
