import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CombatGateway } from './combat.gateway';
import { CombatService } from './combat.service';
import { LevelGenModule } from '../level-gen/level-gen.module';
import { LootModule } from '../loot/loot.module';
import { EndgameModule } from '../endgame/endgame.module';
import { Character } from '../shared/entities/character.entity';
import { Player } from '../shared/entities/player.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { CombatSession } from '../shared/entities/combat-session.entity';
import { Item } from '../shared/entities/item.entity';
import { EquipmentSlot } from '../shared/entities/equipment-slot.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Character, Player, PlayerLeague, CombatSession, Item, EquipmentSlot]),
    LevelGenModule,
    LootModule,
    EndgameModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default_secret'),
      }),
    }),
  ],
  providers: [CombatService, CombatGateway],
  exports: [CombatService],
})
export class CombatModule {}
