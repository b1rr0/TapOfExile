import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LootController } from './loot.controller';
import { LootService } from './loot.service';
import { Item } from '../shared/entities/item.entity';
import { EquipmentSlot } from '../shared/entities/equipment-slot.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { Character } from '../shared/entities/character.entity';
import { PlayerModule } from '../player/player.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Item, EquipmentSlot, PlayerLeague, Character]),
    PlayerModule,
  ],
  controllers: [LootController],
  providers: [LootService],
  exports: [LootService],
})
export class LootModule {}
