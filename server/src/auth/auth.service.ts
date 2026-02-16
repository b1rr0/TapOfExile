import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Player } from '../shared/entities/player.entity';
import { RedisService } from '../redis/redis.service';
import { TelegramUser } from './interfaces/telegram-user.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly botToken: string;
  private readonly jwtAccessExpiry: number;
  private readonly jwtRefreshExpiry: number;

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private redis: RedisService,
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
  ) {
    this.botToken = config.get<string>('BOT_TOKEN', '');
    this.jwtAccessExpiry = config.get<number>('JWT_ACCESS_EXPIRY', 3600);
    this.jwtRefreshExpiry = config.get<number>('JWT_REFRESH_EXPIRY', 2592000);
  }

  /**
   * Validate Telegram WebApp initData using HMAC-SHA256.
   * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   */
  validateTelegramInitData(initData: string): TelegramUser {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      throw new UnauthorizedException('Missing hash in initData');
    }
    params.delete('hash');

    // Sort alphabetically and build data check string
    const entries = Array.from(params.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    // HMAC-SHA256 validation
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(this.botToken)
      .digest();

    const checkHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (checkHash !== hash) {
      throw new UnauthorizedException('Invalid Telegram initData signature');
    }

    // Check auth_date freshness (24h window)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      throw new UnauthorizedException('Telegram auth data expired');
    }

    const userStr = params.get('user');
    if (!userStr) {
      throw new UnauthorizedException('Missing user in initData');
    }

    return JSON.parse(userStr) as TelegramUser;
  }

  /**
   * Find or create a Player record by Telegram user ID.
   */
  async findOrCreatePlayer(tgUser: TelegramUser): Promise<Player> {
    const telegramId = String(tgUser.id);
    let player = await this.playerRepo.findOne({
      where: { telegramId },
    });

    if (!player) {
      player = this.playerRepo.create({
        telegramId,
        telegramUsername: tgUser.username || null,
        telegramFirstName: tgUser.first_name || null,
        activeLeagueId: null,
        totalTaps: '0',
        totalKills: '0',
        totalGold: '0',
        lastSaveTime: String(Date.now()),
      });
      await this.playerRepo.save(player);
    } else {
      // Update Telegram info on each login
      player.telegramUsername = tgUser.username || null;
      player.telegramFirstName = tgUser.first_name || null;
      await this.playerRepo.save(player);
    }

    return player;
  }

  /**
   * Issue access + refresh JWT tokens.
   */
  async issueTokens(player: Player) {
    const accessPayload: JwtPayload = {
      sub: player.telegramId,
      type: 'access',
    };
    const refreshPayload: JwtPayload = {
      sub: player.telegramId,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.jwtAccessExpiry,
    });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: this.jwtRefreshExpiry,
    });

    // Store refresh token in Redis
    await this.redis.set(
      `auth:refresh:${player.telegramId}`,
      refreshToken,
      this.jwtRefreshExpiry,
    );

    return { accessToken, refreshToken };
  }

  /**
   * Refresh an expired access token.
   */
  async refreshAccessToken(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Verify token exists in Redis
    const stored = await this.redis.get(`auth:refresh:${payload.sub}`);
    if (stored !== refreshToken) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    const accessPayload: JwtPayload = {
      sub: payload.sub,
      type: 'access',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.jwtAccessExpiry,
    });

    return { accessToken };
  }

  /**
   * Check if a user is subscribed to the required Telegram channel.
   * Uses Telegram Bot API getChatMember.
   */
  async checkChannelMembership(telegramId: string): Promise<{ subscribed: boolean }> {
    const chatId = '@tap_of_exile';
    const url = `https://api.telegram.org/bot${this.botToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${telegramId}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      console.log(`[Auth] checkChannelMembership user=${telegramId}`, JSON.stringify(data));

      if (data.ok) {
        const status: string = data.result?.status;
        // creator = owner, administrator, member = subscribed
        // restricted with is_member = true is also subscribed
        if (['member', 'administrator', 'creator'].includes(status)) {
          return { subscribed: true };
        }
        if (status === 'restricted' && data.result?.is_member) {
          return { subscribed: true };
        }
        return { subscribed: false };
      }

      console.warn(`[Auth] Telegram API error:`, JSON.stringify(data));
      return { subscribed: false };
    } catch (err) {
      console.error(`[Auth] checkChannelMembership fetch error:`, err);
      // If Telegram API is unreachable, allow through to avoid blocking
      return { subscribed: true };
    }
  }

  /**
   * Authenticate via Telegram initData: validate → find/create player → issue tokens.
   * Returns ban info if player is currently banned.
   */
  async authenticateTelegram(initData: string) {
    const tgUser = this.validateTelegramInitData(initData);
    const player = await this.findOrCreatePlayer(tgUser);
    const tokens = await this.issueTokens(player);

    // Ban check
    const isBanned = player.bannedUntil && player.bannedUntil.getTime() > Date.now();

    return {
      ...tokens,
      player: {
        telegramId: player.telegramId,
        username: player.telegramUsername,
        firstName: player.telegramFirstName,
        activeLeagueId: player.activeLeagueId,
        gameVersion: player.gameVersion,
        banned: isBanned ? true : false,
        bannedUntil: isBanned ? player.bannedUntil!.getTime() : null,
        banReason: isBanned ? (player.banReason || 'rate_limit') : null,
      },
    };
  }
}
