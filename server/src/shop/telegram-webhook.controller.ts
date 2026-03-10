import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  UnauthorizedException,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShopService } from './shop.service';
import { SHOP_PRODUCTS } from '@shared/shop-products';

/**
 * Telegram Bot webhook endpoint.
 *
 * Handles `pre_checkout_query` and `successful_payment` for Stars payments.
 * Must bypass the global ValidationPipe since Telegram sends arbitrary JSON.
 */
@Controller('telegram-webhook')
@UsePipes(new ValidationPipe({ whitelist: false, transform: false, forbidNonWhitelisted: false }))
export class TelegramWebhookController {
  private readonly logger = new Logger('TelegramWebhook');
  private readonly webhookSecret: string;

  constructor(
    private shopService: ShopService,
    private config: ConfigService,
  ) {
    this.webhookSecret = config.get<string>('TELEGRAM_WEBHOOK_SECRET', '');
  }

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Req() req: any,
    @Body() update: any,
  ) {
    // Verify secret token header
    if (this.webhookSecret) {
      const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
      if (secretHeader !== this.webhookSecret) {
        this.logger.warn('Invalid webhook secret token');
        throw new UnauthorizedException('Invalid secret token');
      }
    }

    // Handle pre_checkout_query - MUST answer within 10 seconds
    if (update.pre_checkout_query) {
      await this.handlePreCheckout(update.pre_checkout_query);
      return { ok: true };
    }

    // Handle successful_payment (comes inside a message)
    if (update.message?.successful_payment) {
      await this.handleSuccessfulPayment(
        update.message.from,
        update.message.successful_payment,
      );
      return { ok: true };
    }

    // Other update types - ignore
    return { ok: true };
  }

  private async handlePreCheckout(query: any): Promise<void> {
    try {
      const parsed = JSON.parse(query.invoice_payload);
      const product = SHOP_PRODUCTS.find((p) => p.id === parsed.productId);

      if (!product || query.total_amount !== product.starsPrice) {
        await this.shopService.answerPreCheckoutQuery(
          query.id,
          false,
          'Invalid product or price',
        );
        return;
      }

      await this.shopService.answerPreCheckoutQuery(query.id, true);
    } catch (err) {
      this.logger.error('Pre-checkout error:', err);
      await this.shopService.answerPreCheckoutQuery(
        query.id,
        false,
        'Internal error',
      );
    }
  }

  private async handleSuccessfulPayment(
    from: any,
    payment: any,
  ): Promise<void> {
    const telegramId = String(from.id);

    await this.shopService.processSuccessfulPayment(
      telegramId,
      payment.telegram_payment_charge_id,
      payment.provider_payment_charge_id || null,
      payment.invoice_payload,
      payment.total_amount,
    );
  }
}
