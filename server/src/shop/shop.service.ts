import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Player } from '../shared/entities/player.entity';
import { Payment } from '../shared/entities/payment.entity';
import { ShardTransaction } from '../shared/entities/shard-transaction.entity';
import { ShopItem } from '../shared/entities/shop-item.entity';
import { SHOP_PRODUCTS } from '@shared/shop-products';
import { B } from '@shared/balance';

@Injectable()
export class ShopService implements OnModuleInit {
  private readonly logger = new Logger('ShopService');
  private readonly botToken: string;

  constructor(
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(ShardTransaction)
    private shardTxRepo: Repository<ShardTransaction>,
    @InjectRepository(ShopItem)
    private shopItemRepo: Repository<ShopItem>,
    private config: ConfigService,
    private dataSource: DataSource,
  ) {
    this.botToken = config.get<string>('BOT_TOKEN', '');
  }

  /** Seed default shop items on startup if empty. */
  async onModuleInit() {
    const count = await this.shopItemRepo.count();
    if (count === 0) {
      await this.shopItemRepo.save({
        id: 'trade_slots_10',
        label: '+10 Trade Slots',
        description: 'Expand your trade listing limit by 10 slots',
        category: 'upgrades',
        priceShards: 100,
        enabled: true,
        metadata: { slots: 10 },
        sortOrder: 0,
      });
      this.logger.log('Seeded default shop items');
    }
  }

  // ── Balance ──────────────────────────────────────────────

  async getBalance(telegramId: string) {
    const player = await this.playerRepo.findOne({
      where: { telegramId },
      select: ['telegramId', 'shards', 'extraTradeSlots'],
    });
    if (!player) throw new NotFoundException('Player not found');
    return {
      shards: player.shards,
      extraTradeSlots: player.extraTradeSlots,
      maxTradeSlots: B.BASE_TRADE_SLOTS + player.extraTradeSlots,
    };
  }

  // ── Shop items (from DB) ─────────────────────────────────

  async getShopItems(): Promise<ShopItem[]> {
    return this.shopItemRepo.find({
      where: { enabled: true },
      order: { sortOrder: 'ASC' },
    });
  }

  // ── Create Telegram Stars invoice ────────────────────────

  async createInvoiceLink(
    telegramId: string,
    productId: string,
  ): Promise<{ invoiceLink: string }> {
    const product = SHOP_PRODUCTS.find((p) => p.id === productId);
    if (!product) throw new BadRequestException('Unknown product');

    const payload = JSON.stringify({
      telegramId,
      productId,
      ts: Date.now(),
    });

    const res = await fetch(
      `https://api.telegram.org/bot${this.botToken}/createInvoiceLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: product.label,
          description: product.description,
          payload,
          currency: 'XTR',
          prices: [{ label: product.label, amount: product.starsPrice }],
        }),
      },
    );

    const data = await res.json();
    if (!data.ok) {
      this.logger.error('createInvoiceLink failed: ' + JSON.stringify(data));
      throw new InternalServerErrorException('Failed to create invoice');
    }

    return { invoiceLink: data.result };
  }

  // ── Process successful payment (webhook) ─────────────────

  async processSuccessfulPayment(
    telegramId: string,
    telegramPaymentChargeId: string,
    providerPaymentChargeId: string | null,
    invoicePayload: string,
    totalAmount: number,
  ): Promise<void> {
    let parsed: { telegramId: string; productId: string };
    try {
      parsed = JSON.parse(invoicePayload);
    } catch {
      this.logger.error('Invalid invoice payload: ' + invoicePayload);
      return;
    }

    if (String(parsed.telegramId) !== String(telegramId)) {
      this.logger.error('telegramId mismatch in payload');
      return;
    }

    const product = SHOP_PRODUCTS.find((p) => p.id === parsed.productId);
    if (!product) {
      this.logger.error('Unknown product in payload: ' + parsed.productId);
      return;
    }

    if (totalAmount !== product.starsPrice) {
      this.logger.error(
        `Amount mismatch: ${totalAmount} vs ${product.starsPrice}`,
      );
      return;
    }

    await this.dataSource.transaction(async (em) => {
      // Idempotency: check for duplicate
      const existing = await em
        .getRepository(Payment)
        .findOne({ where: { telegramPaymentChargeId } });
      if (existing) {
        this.logger.log('Duplicate payment ignored: ' + telegramPaymentChargeId);
        return;
      }

      // Lock player row
      const player = await em
        .getRepository(Player)
        .createQueryBuilder('p')
        .setLock('pessimistic_write')
        .where('p.telegramId = :telegramId', { telegramId })
        .getOne();

      if (!player) {
        this.logger.error('Player not found for payment: ' + telegramId);
        return;
      }

      // Credit shards
      const newBalance =
        BigInt(player.shards) + BigInt(product.shardsReward);
      player.shards = newBalance.toString();
      await em.save(player);

      // Record payment
      const payment = em.getRepository(Payment).create({
        playerTelegramId: telegramId,
        productId: product.id,
        shardsAmount: product.shardsReward,
        starsAmount: product.starsPrice,
        telegramPaymentChargeId,
        providerPaymentChargeId,
        invoicePayload,
        status: 'completed',
      });
      await em.save(payment);

      // Record shard transaction
      const tx = em.getRepository(ShardTransaction).create({
        playerTelegramId: telegramId,
        type: 'purchase',
        amount: product.shardsReward,
        balanceAfter: newBalance.toString(),
        reason: 'stars_purchase',
        referenceId: payment.id,
      });
      await em.save(tx);

      this.logger.log(
        `Payment processed: ${telegramId} +${product.shardsReward} shards (${product.starsPrice} stars)`,
      );

      // Referral income: award referrer 10% of shards purchased
      if (player.referrerId) {
        const referralIncome = Math.floor(product.shardsReward * B.REFERRAL_INCOME_PERCENT / 100);
        if (referralIncome > 0) {
          const referrer = await em
            .getRepository(Player)
            .createQueryBuilder('p')
            .setLock('pessimistic_write')
            .where('p.telegramId = :id', { id: player.referrerId })
            .getOne();

          if (referrer) {
            const refNewBalance = BigInt(referrer.shards) + BigInt(referralIncome);
            referrer.shards = refNewBalance.toString();
            await em.save(referrer);

            const refTx = em.getRepository(ShardTransaction).create({
              playerTelegramId: player.referrerId,
              type: 'purchase',
              amount: referralIncome,
              balanceAfter: refNewBalance.toString(),
              reason: 'referral_income',
              referenceId: telegramId,
            });
            await em.save(refTx);

            this.logger.log(
              `Referral income: ${player.referrerId} +${referralIncome} shards from ${telegramId}'s purchase`,
            );
          }
        }
      }
    });
  }

  // ── Answer pre-checkout query ────────────────────────────

  async answerPreCheckoutQuery(
    queryId: string,
    ok: boolean,
    errorMessage?: string,
  ): Promise<void> {
    const body: Record<string, any> = {
      pre_checkout_query_id: queryId,
      ok,
    };
    if (!ok && errorMessage) {
      body.error_message = errorMessage;
    }

    const res = await fetch(
      `https://api.telegram.org/bot${this.botToken}/answerPreCheckoutQuery`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    const data = await res.json();
    if (!data.ok) {
      this.logger.error('answerPreCheckoutQuery failed: ' + JSON.stringify(data));
    }
  }

  // ── Buy shop item with Shards ────────────────────────────

  async buyShopItem(
    telegramId: string,
    shopItemId: string,
  ): Promise<{
    shards: string;
    extraTradeSlots: number;
    maxTradeSlots: number;
  }> {
    return this.dataSource.transaction(async (em) => {
      // Load shop item
      const shopItem = await em
        .getRepository(ShopItem)
        .findOne({ where: { id: shopItemId, enabled: true } });
      if (!shopItem) throw new BadRequestException('Shop item not found');

      // Lock player
      const player = await em
        .getRepository(Player)
        .createQueryBuilder('p')
        .setLock('pessimistic_write')
        .where('p.telegramId = :telegramId', { telegramId })
        .getOne();
      if (!player) throw new NotFoundException('Player not found');

      // Check balance
      const currentShards = BigInt(player.shards);
      const cost = BigInt(shopItem.priceShards);
      if (currentShards < cost) {
        throw new BadRequestException('Insufficient Shards');
      }

      // Apply effect based on shop item
      if (shopItemId === 'trade_slots_10') {
        if (player.extraTradeSlots >= B.MAX_EXTRA_TRADE_SLOTS) {
          throw new BadRequestException('Maximum trade slots reached');
        }
        player.extraTradeSlots = Math.min(
          player.extraTradeSlots + B.TRADE_SLOTS_PER_PURCHASE,
          B.MAX_EXTRA_TRADE_SLOTS,
        );
      }

      // Deduct shards
      const newBalance = currentShards - cost;
      player.shards = newBalance.toString();
      await em.save(player);

      // Record shard transaction
      const tx = em.getRepository(ShardTransaction).create({
        playerTelegramId: telegramId,
        type: 'spend',
        amount: -shopItem.priceShards,
        balanceAfter: newBalance.toString(),
        reason: shopItemId,
        referenceId: shopItemId,
      });
      await em.save(tx);

      return {
        shards: player.shards,
        extraTradeSlots: player.extraTradeSlots,
        maxTradeSlots: B.BASE_TRADE_SLOTS + player.extraTradeSlots,
      };
    });
  }

  // ── History ──────────────────────────────────────────────

  async getPaymentHistory(telegramId: string): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { playerTelegramId: telegramId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getTransactionHistory(telegramId: string): Promise<ShardTransaction[]> {
    return this.shardTxRepo.find({
      where: { playerTelegramId: telegramId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
