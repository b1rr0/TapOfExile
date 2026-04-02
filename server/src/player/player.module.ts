import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerController } from './player.controller';
import { PlayerService } from './player.service';
import { Player } from '../shared/entities/player.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { ShardTransaction } from '../shared/entities/shard-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Player, PlayerLeague, ShardTransaction])],
  controllers: [PlayerController],
  providers: [PlayerService],
  exports: [PlayerService],
})
export class PlayerModule {}
