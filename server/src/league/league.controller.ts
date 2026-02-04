import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { LeagueService } from './league.service';
import { LeagueMigrationService } from './league-migration.service';
import { SwitchLeagueDto } from './dto/switch-league.dto';

@ApiTags('leagues')
@Controller('leagues')
export class LeagueController {
  constructor(
    private leagueService: LeagueService,
    private migrationService: LeagueMigrationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all active leagues' })
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

  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active league participation' })
  async getActiveLeague(@CurrentUser('telegramId') telegramId: string) {
    const pl = await this.leagueService.getActivePlayerLeague(telegramId);
    return {
      id: pl.id,
      leagueId: pl.leagueId,
      gold: pl.gold,
      activeCharacterId: pl.activeCharacterId,
      characterCount: pl.characters?.length || 0,
      bagCount: pl.bag?.length || 0,
    };
  }

  @Post(':leagueId/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a league' })
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

  @Get(':leagueId/leaderboard')
  @ApiOperation({ summary: 'Get league leaderboard' })
  async getLeaderboard(
    @Param('leagueId') leagueId: string,
    @Query('limit') limit?: string,
  ) {
    const entries = await this.leagueService.getLeaderboard(
      leagueId,
      limit ? parseInt(limit, 10) : 50,
    );
    return { leaderboard: entries };
  }
}
