import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Player } from '../shared/entities/player.entity';
import { RedisService } from '../redis/redis.service';
import { TelegramUser } from './interfaces/telegram-user.interface';
export declare class AuthService {
    private jwtService;
    private config;
    private redis;
    private playerRepo;
    private readonly botToken;
    private readonly jwtAccessExpiry;
    private readonly jwtRefreshExpiry;
    constructor(jwtService: JwtService, config: ConfigService, redis: RedisService, playerRepo: Repository<Player>);
    validateTelegramInitData(initData: string): TelegramUser;
    findOrCreatePlayer(tgUser: TelegramUser): Promise<Player>;
    issueTokens(player: Player): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    refreshAccessToken(refreshToken: string): Promise<{
        accessToken: string;
    }>;
    authenticateTelegram(initData: string): Promise<{
        player: {
            telegramId: string;
            username: string | null;
            firstName: string | null;
            gold: string;
            activeCharacterId: string | null;
            gameVersion: number;
        };
        accessToken: string;
        refreshToken: string;
    }>;
}
