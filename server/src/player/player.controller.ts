import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
  async getPlayerState(@CurrentUser('telegramId') telegramId: string) {
    return this.playerService.getPlayerState(telegramId);
  }
}
