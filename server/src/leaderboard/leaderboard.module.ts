import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { DojoRecord } from '../shared/entities/dojo-record.entity';
import { Character } from '../shared/entities/character.entity';
import { League } from '../shared/entities/league.entity';
import { EquipmentSlot } from '../shared/entities/equipment-slot.entity';
import { Item } from '../shared/entities/item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DojoRecord, Character, League, EquipmentSlot, Item])],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
})
export class LeaderboardModule {}
