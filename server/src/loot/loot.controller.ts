import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { LootService } from './loot.service';
import { PlayerService } from '../player/player.service';

@ApiTags('loot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loot')
export class LootController {
  constructor(
    private lootService: LootService,
    private playerService: PlayerService,
  ) {}

  @Get('bag')
  @ApiOperation({ summary: 'Get bag contents for active league' })
  async getBag(@CurrentUser('telegramId') telegramId: string) {
    const pl = await this.playerService.getActivePlayerLeague(telegramId);
    return this.lootService.getBag(pl.id);
  }

  @Delete('bag/:itemId')
  @ApiOperation({ summary: 'Discard item from league bag' })
  async discardItem(
    @CurrentUser('telegramId') telegramId: string,
    @Param('itemId') itemId: string,
  ) {
    const pl = await this.playerService.getActivePlayerLeague(telegramId);
    await this.lootService.removeItem(pl.id, itemId);
    return { success: true };
  }
}
