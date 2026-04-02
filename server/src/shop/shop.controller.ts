import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { ShopService } from './shop.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { BuyItemDto } from './dto/buy-item.dto';
import { SHOP_PRODUCTS } from '@shared/shop-products';

@ApiTags('shop')
@Controller('shop')
export class ShopController {
  constructor(private shopService: ShopService) {}

  // ── Public ──────────────────────────────────────────────

  @Get('products')
  @ApiOperation({ summary: 'Get Telegram Stars → Shards packages' })
  @ApiResponse({ status: 200, description: 'List of purchasable Shard packages' })
  getProducts() {
    return { products: SHOP_PRODUCTS };
  }

  @Get('items')
  @ApiOperation({ summary: 'Get shop items purchasable with Shards' })
  @ApiResponse({ status: 200, description: 'List of enabled shop items' })
  async getShopItems() {
    const items = await this.shopService.getShopItems();
    return { items };
  }

  // ── Authenticated ───────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('balance')
  @ApiOperation({ summary: 'Get Shards balance and trade slot info' })
  async getBalance(@CurrentUser('telegramId') telegramId: string) {
    return this.shopService.getBalance(telegramId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('create-invoice')
  @ApiOperation({ summary: 'Create Telegram Stars invoice link' })
  @ApiResponse({ status: 201, description: 'Invoice link for WebApp.openInvoice()' })
  async createInvoice(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.shopService.createInvoiceLink(telegramId, dto.productId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('buy-item')
  @ApiOperation({ summary: 'Buy a shop item with Shards' })
  @ApiResponse({ status: 201, description: 'Purchase successful' })
  @ApiResponse({ status: 400, description: 'Insufficient shards or item unavailable' })
  async buyItem(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: BuyItemDto,
  ) {
    return this.shopService.buyShopItem(telegramId, dto.shopItemId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('payments')
  @ApiOperation({ summary: 'Get Stars payment history (donations)' })
  async getPayments(@CurrentUser('telegramId') telegramId: string) {
    return this.shopService.getPaymentHistory(telegramId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  @ApiOperation({ summary: 'Get Shard transaction history (credits/debits)' })
  async getTransactions(@CurrentUser('telegramId') telegramId: string) {
    return this.shopService.getTransactionHistory(telegramId);
  }
}
