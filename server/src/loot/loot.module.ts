import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LootController } from './loot.controller';
import { LootService } from './loot.service';
import { BagItem } from '../shared/entities/bag-item.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { PlayerModule } from '../player/player.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BagItem, PlayerLeague]),
    PlayerModule,
  ],
  controllers: [LootController],
  providers: [LootService],
  exports: [LootService],
})
export class LootModule {}
