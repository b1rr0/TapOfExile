import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { LeagueService } from './league.service';
import { SwitchLeagueDto } from './dto/switch-league.dto';

@ApiTags('leagues')
@Controller('leagues')
export class LeagueController {
  constructor(private leagueService: LeagueService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active leagues' })
  @ApiResponse({ status: 200, description: 'Active leagues list' })
  async getActiveLeagues() {
    const leagues = await this.leagueService.getActiveLeagues();
    return {
      leagues: leagues.map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        status: l.status,
        startsAt: l.startsAt.toISOString(),
        endsAt: l.endsAt?.toISOString() || null,
      })),
    };
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current player leagues' })
  @ApiResponse({ status: 200, description: 'Player league memberships' })
  async getMyLeagues(@CurrentUser('telegramId') telegramId: string) {
    const playerLeagues =
      await this.leagueService.getPlayerLeagues(telegramId);
    return {
      playerLeagues: playerLeagues.map((pl) => ({
        id: pl.id,
        leagueId: pl.leagueId,
        leagueName: pl.league?.name,
        leagueType: pl.league?.type,
        gold: pl.gold,
        activeCharacterId: pl.activeCharacterId,
        joinedAt: pl.joinedAt.toISOString(),
      })),
    };
  }

  @Post(':leagueId/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a league' })
  @ApiResponse({ status: 201, description: 'Joined league' })
  @ApiResponse({ status: 400, description: 'Already in this league' })
  async joinLeague(
    @CurrentUser('telegramId') telegramId: string,
    @Param('leagueId') leagueId: string,
  ) {
    const pl = await this.leagueService.joinLeague(telegramId, leagueId);
    return {
      id: pl.id,
      leagueId: pl.leagueId,
      leagueName: pl.league?.name,
      gold: pl.gold,
    };
  }

  @Post('switch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Switch active league' })
  @ApiResponse({ status: 201, description: 'Active league switched' })
  @ApiResponse({ status: 404, description: 'League not found or player not in league' })
  async switchLeague(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: SwitchLeagueDto,
  ) {
    const pl = await this.leagueService.switchLeague(
      telegramId,
      dto.leagueId,
    );
    return {
      id: pl.id,
      leagueId: pl.leagueId,
      gold: pl.gold,
      activeCharacterId: pl.activeCharacterId,
    };
  }
}
