import { AuthService } from './auth.service';
import { TelegramAuthDto } from './dto/telegram-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    authenticateTelegram(dto: TelegramAuthDto): Promise<{
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
    refreshToken(dto: RefreshTokenDto): Promise<{
        accessToken: string;
    }>;
}
