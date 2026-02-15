import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { League } from '../shared/entities/league.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { Player } from '../shared/entities/player.entity';
import { Character } from '../shared/entities/character.entity';
import { Item } from '../shared/entities/item.entity';
import { LeagueService } from './league.service';
import { LeagueController } from './league.controller';
import { LeagueMigrationService } from './league-migration.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      League,
      PlayerLeague,
      Player,
      Character,
      Item,
    ]),
  ],
  controllers: [LeagueController],
  providers: [LeagueService, LeagueMigrationService],
  exports: [LeagueService],
})
export class LeagueModule {}
