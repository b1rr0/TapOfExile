import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { Player } from './shared/entities/player.entity';
import { LastSeenInterceptor } from './auth/interceptors/last-seen.interceptor';
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
import { FriendsModule } from './friends/friends.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { TradeModule } from './trade/trade.module';
import { SkillEquipModule } from './skills/skill-equip.module';
import { ShopModule } from './shop/shop.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot(
      {
        rootPath: join(__dirname, '..', '..', 'public', 'bot'),
        serveRoot: '/',
        exclude: ['/api/(.*)', '/socket.io/(.*)'],
      },
      {
        rootPath: join(__dirname, '..', '..', 'public', 'wiki'),
        serveRoot: '/wiki',
        exclude: ['/api/(.*)', '/socket.io/(.*)'],
      },
    ),
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
    FriendsModule,
    LeaderboardModule,
    TradeModule,
    SkillEquipModule,
    ShopModule,
    TypeOrmModule.forFeature([Player]),
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LastSeenInterceptor,
    },
  ],
})
export class AppModule {}
