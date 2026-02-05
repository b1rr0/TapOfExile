import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { PlayerModule } from './player/player.module';
import { CharacterModule } from './character/character.module';
import { CombatModule } from './combat/combat.module';
import { LevelGenModule } from './level-gen/level-gen.module';
import { LootModule } from './loot/loot.module';
import { SkillTreeModule } from './skill-tree/skill-tree.module';
import { EndgameModule } from './endgame/endgame.module';
import { LeagueModule } from './league/league.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    RedisModule,
    AuthModule,
    PlayerModule,
    CharacterModule,
    CombatModule,
    LevelGenModule,
    LootModule,
    SkillTreeModule,
    EndgameModule,
    LeagueModule,
  ],
})
export class AppModule {}
