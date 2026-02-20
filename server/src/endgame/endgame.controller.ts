import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { EndgameService } from './endgame.service';
import { CharacterIdQueryDto } from '../shared/dto/character-id-query.dto';

@ApiTags('endgame')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('endgame')
export class EndgameController {
  constructor(private endgameService: EndgameService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get endgame status' })
  @ApiResponse({ status: 200, description: 'Endgame unlock status and progress' })
  async getStatus(
    @CurrentUser('telegramId') telegramId: string,
    @Query() query: CharacterIdQueryDto,
  ) {
    return this.endgameService.getStatus(telegramId, query.characterId);
  }

  @Post('check-unlock')
  @ApiOperation({ summary: 'Check and unlock endgame' })
  @ApiResponse({ status: 201, description: 'Endgame unlock result' })
  @ApiResponse({ status: 403, description: 'Character not owned by player' })
  async checkUnlock(
    @CurrentUser('telegramId') telegramId: string,
    @Body() body: CharacterIdQueryDto,
  ) {
    return this.endgameService.checkUnlock(telegramId, body.characterId);
  }
}
