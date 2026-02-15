import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
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

  @Post('equip-potion')
  @ApiOperation({ summary: 'Equip a potion from bag to consumable slot' })
  async equipPotion(
    @CurrentUser('telegramId') telegramId: string,
    @Body() body: { itemId?: string; bagItemId?: string; slot: 'consumable-1' | 'consumable-2' },
  ) {
    const pl = await this.playerService.getActivePlayerLeague(telegramId);
    const itemId = body.itemId || body.bagItemId;
    if (!itemId) throw new Error('itemId or bagItemId is required');
    await this.lootService.equipPotion(
      pl.id,
      pl.activeCharacterId!,
      itemId,
      body.slot,
    );
    return { success: true };
  }

  @Post('unequip-potion')
  @ApiOperation({ summary: 'Unequip a potion from consumable slot back to bag' })
  async unequipPotion(
    @CurrentUser('telegramId') telegramId: string,
    @Body() body: { slot: 'consumable-1' | 'consumable-2' },
  ) {
    const pl = await this.playerService.getActivePlayerLeague(telegramId);
    await this.lootService.unequipPotion(
      pl.id,
      pl.activeCharacterId!,
      body.slot,
    );
    return { success: true };
  }
}
