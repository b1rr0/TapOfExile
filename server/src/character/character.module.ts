import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharacterController } from './character.controller';
import { CharacterService } from './character.service';
import { Character } from '../shared/entities/character.entity';
import { Player } from '../shared/entities/player.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { League } from '../shared/entities/league.entity';
import { ShardTransaction } from '../shared/entities/shard-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Character, Player, PlayerLeague, League, ShardTransaction])],
  controllers: [CharacterController],
  providers: [CharacterService],
  exports: [CharacterService],
})
export class CharacterModule {}
