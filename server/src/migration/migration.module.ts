import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MigrationController } from './migration.controller';
import { MigrationService } from './migration.service';
import { Player } from '../shared/entities/player.entity';
import { Character } from '../shared/entities/character.entity';
import { BagItem } from '../shared/entities/bag-item.entity';
import { League } from '../shared/entities/league.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Player, Character, BagItem, League, PlayerLeague])],
  controllers: [MigrationController],
  providers: [MigrationService],
})
export class MigrationModule {}
