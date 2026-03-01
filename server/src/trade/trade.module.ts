import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradeController } from './trade.controller';
import { TradeService } from './trade.service';
import { TradeListing } from '../shared/entities/trade-listing.entity';
import { Item } from '../shared/entities/item.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { Character } from '../shared/entities/character.entity';
import { PlayerModule } from '../player/player.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TradeListing, Item, PlayerLeague, Character]),
    PlayerModule,
  ],
  controllers: [TradeController],
  providers: [TradeService],
  exports: [TradeService],
})
export class TradeModule {}
