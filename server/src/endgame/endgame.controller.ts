import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { EndgameService } from './endgame.service';

@ApiTags('endgame')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('endgame')
export class EndgameController {
  constructor(private endgameService: EndgameService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get endgame status' })
  async getStatus(
    @CurrentUser('telegramId') telegramId: string,
    @Query('characterId') characterId: string,
  ) {
    return this.endgameService.getStatus(telegramId, characterId);
  }

  @Post('check-unlock')
  @ApiOperation({ summary: 'Check and unlock endgame' })
  async checkUnlock(
    @CurrentUser('telegramId') telegramId: string,
    @Query('characterId') characterId: string,
  ) {
    return this.endgameService.checkUnlock(telegramId, characterId);
  }
}
