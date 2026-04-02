import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { TradeService } from './trade.service';
import { PlayerService } from '../player/player.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { BuyListingDto } from './dto/buy-listing.dto';
import { CancelListingDto } from './dto/cancel-listing.dto';
import { BrowseListingsDto } from './dto/browse-listings.dto';
import { B } from '@shared/balance';

@ApiTags('trade')
@Controller('trade')
export class TradeController {
  constructor(
    private tradeService: TradeService,
    private playerService: PlayerService,
  ) {}

  // ── Public endpoints (no auth) ─────────────────────────────────

  @Get('browse')
  @ApiOperation({ summary: 'Browse active trade listings (public)' })
  @ApiResponse({ status: 200, description: 'Paginated listings + total count' })
  async browse(@Query() dto: BrowseListingsDto) {
    return this.tradeService.browse(dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get market stats (public)' })
  @ApiResponse({ status: 200, description: 'Active listings count, 24h volume' })
  async getStats(@Query('leagueId') leagueId?: string) {
    return this.tradeService.getStats(leagueId);
  }

  // ── Authenticated endpoints ────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my')
  @ApiOperation({ summary: 'Get my active listings' })
  @ApiResponse({ status: 200, description: 'Array of active trade listings' })
  async myListings(@CurrentUser('telegramId') telegramId: string) {
    const pl = await this.playerService.getActivePlayerLeague(telegramId);
    return this.tradeService.myListings(pl.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('history')
  @ApiOperation({ summary: 'Get trade history (sold/bought/cancelled)' })
  @ApiResponse({ status: 200, description: 'Array of past trade listings' })
  async history(@CurrentUser('telegramId') telegramId: string) {
    return this.tradeService.history(telegramId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('list')
  @ApiOperation({ summary: 'Create a new trade listing (escrow item)' })
  @ApiResponse({ status: 201, description: 'Trade listing created' })
  @ApiResponse({ status: 400, description: 'Validation error or limit reached' })
  async createListing(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: CreateListingDto,
  ) {
    const pl = await this.playerService.getActivePlayerLeague(telegramId);
    const player = await this.playerService.getPlayer(telegramId);
    const maxSlots = B.BASE_TRADE_SLOTS + (player.extraTradeSlots || 0);
    const listing = await this.tradeService.createListing(
      telegramId,
      pl,
      dto.itemId,
      dto.price,
      maxSlots,
    );
    return { success: true, listing };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('buy')
  @ApiOperation({ summary: 'Buy a trade listing' })
  @ApiResponse({ status: 201, description: 'Item purchased' })
  @ApiResponse({ status: 400, description: 'Insufficient gold or listing unavailable' })
  async buy(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: BuyListingDto,
  ) {
    const pl = await this.playerService.getActivePlayerLeague(telegramId);
    const { goldSpent, listing } = await this.tradeService.buyListing(
      telegramId,
      pl,
      dto.listingId,
    );
    return { success: true, goldSpent, listing };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  @ApiOperation({ summary: 'Cancel own trade listing (return item to bag)' })
  @ApiResponse({ status: 201, description: 'Listing cancelled' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async cancel(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: CancelListingDto,
  ) {
    const pl = await this.playerService.getActivePlayerLeague(telegramId);
    await this.tradeService.cancelListing(pl, dto.listingId);
    return { success: true };
  }
}
