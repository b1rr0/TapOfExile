import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { PlayerService } from './player.service';

@ApiTags('player')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('player')
export class PlayerController {
  constructor(private playerService: PlayerService) {}

  @Get()
  @ApiOperation({ summary: 'Get full player state' })
  @ApiResponse({ status: 200, description: 'Player state with characters, bag, and meta' })
  @ApiResponse({ status: 404, description: 'Player not found or no active league' })
  async getPlayerState(@CurrentUser('telegramId') telegramId: string) {
    return this.playerService.getPlayerState(telegramId);
  }
}
