import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from '../shared/entities/player.entity';
import { Payment } from '../shared/entities/payment.entity';
import { ShardTransaction } from '../shared/entities/shard-transaction.entity';
import { ShopItem } from '../shared/entities/shop-item.entity';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { TelegramWebhookController } from './telegram-webhook.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Player, Payment, ShardTransaction, ShopItem]),
  ],
  controllers: [ShopController, TelegramWebhookController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
