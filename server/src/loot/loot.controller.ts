import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { LootService } from './loot.service';
import { PlayerService } from '../player/player.service';
import { EquipPotionDto, UnequipPotionDto } from './dto/equip-potion.dto';
import { EquipItemDto, UnequipItemDto } from './dto/equip-item.dto';

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
  @ApiResponse({ status: 200, description: 'Bag items array' })
  async getBag(@CurrentUser('telegramId') telegramId: string) {
    const pl = await this.playerService.getActivePlayerLeague(telegramId);
    return this.lootService.getBag(pl.id);
  }

  @Delete('bag/:itemId')
  @ApiOperation({ summary: 'Discard item from league bag' })
  @ApiResponse({ status: 200, description: 'Item discarded' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async discardItem(
    @CurrentUser('telegramId') telegramId: string,
    @Param('itemId') itemId: string,
  ) {
    const pl = await this.playerService.getActivePlayerLeague(telegramId);
    await this.lootService.removeItem(pl.id, itemId);
    return { success: true };
  }

  @Post('sell/:itemId')
  @ApiOperation({ summary: 'Sell item from bag for gold' })
  @ApiResponse({ status: 201, description: 'Item sold, returns gold earned' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async sellItem(
    @CurrentUser('telegramId') telegramId: string,
    @Param('itemId') itemId: string,
  ) {
    const pl = await this.playerService.getActivePlayerLeague(telegramId);
    return this.lootService.sellItem(pl.id, itemId);
  }

  @Post('bulk-sell')
  @ApiOperation({ summary: 'Sell multiple items from bag at once' })
  @ApiResponse({ status: 201, description: 'Items sold, returns total gold and count' })
  async bulkSell(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: { itemIds: string[] },
  ) {
    const pl = await this.playerService.getActivePlayerLeague(telegramId);
    return this.lootService.bulkSell(pl.id, dto.itemIds);
  }

  @Post('equip-potion')
  @ApiOperation({ summary: 'Equip a potion from bag to consumable slot' })
  @ApiResponse({ status: 201, description: 'Potion equipped' })
  @ApiResponse({ status: 400, description: 'Invalid slot or item' })
  async equipPotion(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: EquipPotionDto,
  ) {
    const pl = await this.playerService.getActivePlayerLeague(telegramId);
    await this.lootService.equipPotion(
      pl.id,
      pl.activeCharacterId!,
      dto.itemId,
      dto.slot,
    );
    return { success: true };
  }

  @Post('unequip-potion')
  @ApiOperation({ summary: 'Unequip a potion from consumable slot back to bag' })
  @ApiResponse({ status: 201, description: 'Potion unequipped' })
  @ApiResponse({ status: 400, description: 'Invalid slot' })
  async unequipPotion(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: UnequipPotionDto,
  ) {
    const pl = await this.playerService.getActivePlayerLeague(telegramId);
    await this.lootService.unequipPotion(
      pl.id,
      pl.activeCharacterId!,
      dto.slot,
    );
    return { success: true };
  }

  // ── Gear equip/unequip ──────────────────────────────────

  @Post('equip-item')
  @ApiOperation({ summary: 'Equip a gear item from bag to equipment slot' })
  @ApiResponse({ status: 201, description: 'Item equipped' })
  @ApiResponse({ status: 400, description: 'Invalid slot, wrong item type, or level too low' })
  async equipItem(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: EquipItemDto,
  ) {
    const pl = await this.playerService.getActivePlayerLeague(telegramId);
    await this.lootService.equipItem(
      pl.id,
      pl.activeCharacterId!,
      dto.itemId,
      dto.slotId,
    );
    return { success: true };
  }

  @Post('unequip-item')
  @ApiOperation({ summary: 'Unequip a gear item from equipment slot back to bag' })
  @ApiResponse({ status: 201, description: 'Item unequipped' })
  @ApiResponse({ status: 400, description: 'Invalid slot' })
  async unequipItem(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: UnequipItemDto,
  ) {
    const pl = await this.playerService.getActivePlayerLeague(telegramId);
    await this.lootService.unequipItem(
      pl.id,
      pl.activeCharacterId!,
      dto.slotId,
    );
    return { success: true };
  }
}
