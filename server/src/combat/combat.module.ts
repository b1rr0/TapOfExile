import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CombatController } from './combat.controller';
import { CombatService } from './combat.service';
import { LevelGenModule } from '../level-gen/level-gen.module';
import { LootModule } from '../loot/loot.module';
import { EndgameModule } from '../endgame/endgame.module';
import { Character } from '../shared/entities/character.entity';
import { Player } from '../shared/entities/player.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { CombatSession } from '../shared/entities/combat-session.entity';
import { BagItem } from '../shared/entities/bag-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Character, Player, PlayerLeague, CombatSession, BagItem]),
    LevelGenModule,
    LootModule,
    EndgameModule,
  ],
  controllers: [CombatController],
  providers: [CombatService],
  exports: [CombatService],
})
export class CombatModule {}
