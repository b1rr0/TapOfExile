"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = require("crypto");
const player_entity_1 = require("../shared/entities/player.entity");
const redis_service_1 = require("../redis/redis.service");
let AuthService = class AuthService {
    jwtService;
    config;
    redis;
    playerRepo;
    botToken;
    jwtAccessExpiry;
    jwtRefreshExpiry;
    constructor(jwtService, config, redis, playerRepo) {
        this.jwtService = jwtService;
        this.config = config;
        this.redis = redis;
        this.playerRepo = playerRepo;
        this.botToken = config.get('BOT_TOKEN', '');
        this.jwtAccessExpiry = config.get('JWT_ACCESS_EXPIRY', 3600);
        this.jwtRefreshExpiry = config.get('JWT_REFRESH_EXPIRY', 2592000);
    }
    validateTelegramInitData(initData) {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        if (!hash) {
            throw new common_1.UnauthorizedException('Missing hash in initData');
        }
        params.delete('hash');
        const entries = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(this.botToken)
            .digest();
        const checkHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        if (checkHash !== hash) {
            throw new common_1.UnauthorizedException('Invalid Telegram initData signature');
        }
        const authDate = parseInt(params.get('auth_date') || '0', 10);
        const now = Math.floor(Date.now() / 1000);
        if (now - authDate > 86400) {
            throw new common_1.UnauthorizedException('Telegram auth data expired');
        }
        const userStr = params.get('user');
        if (!userStr) {
            throw new common_1.UnauthorizedException('Missing user in initData');
        }
        return JSON.parse(userStr);
    }
    async findOrCreatePlayer(tgUser) {
        const telegramId = String(tgUser.id);
        let player = await this.playerRepo.findOne({
            where: { telegramId },
        });
        if (!player) {
            player = this.playerRepo.create({
                telegramId,
                telegramUsername: tgUser.username || null,
                telegramFirstName: tgUser.first_name || null,
                gold: '0',
                totalTaps: '0',
                totalKills: '0',
                totalGold: '0',
                lastSaveTime: String(Date.now()),
            });
            await this.playerRepo.save(player);
        }
        else {
            player.telegramUsername = tgUser.username || null;
            player.telegramFirstName = tgUser.first_name || null;
            await this.playerRepo.save(player);
        }
        return player;
    }
    async issueTokens(player) {
        const accessPayload = {
            sub: player.telegramId,
            type: 'access',
        };
        const refreshPayload = {
            sub: player.telegramId,
            type: 'refresh',
        };
        const accessToken = this.jwtService.sign(accessPayload, {
            expiresIn: this.jwtAccessExpiry,
        });
        const refreshToken = this.jwtService.sign(refreshPayload, {
            expiresIn: this.jwtRefreshExpiry,
        });
        await this.redis.set(`auth:refresh:${player.telegramId}`, refreshToken, this.jwtRefreshExpiry);
        return { accessToken, refreshToken };
    }
    async refreshAccessToken(refreshToken) {
        let payload;
        try {
            payload = this.jwtService.verify(refreshToken);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (payload.type !== 'refresh') {
            throw new common_1.UnauthorizedException('Invalid token type');
        }
        const stored = await this.redis.get(`auth:refresh:${payload.sub}`);
        if (stored !== refreshToken) {
            throw new common_1.UnauthorizedException('Refresh token revoked');
        }
        const accessPayload = {
            sub: payload.sub,
            type: 'access',
        };
        const accessToken = this.jwtService.sign(accessPayload, {
            expiresIn: this.jwtAccessExpiry,
        });
        return { accessToken };
    }
    async authenticateTelegram(initData) {
        const tgUser = this.validateTelegramInitData(initData);
        const player = await this.findOrCreatePlayer(tgUser);
        const tokens = await this.issueTokens(player);
        return {
            ...tokens,
            player: {
                telegramId: player.telegramId,
                username: player.telegramUsername,
                firstName: player.telegramFirstName,
                gold: player.gold,
                activeCharacterId: player.activeCharacterId,
                gameVersion: player.gameVersion,
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectRepository)(player_entity_1.Player)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService,
        redis_service_1.RedisService,
        typeorm_2.Repository])
], AuthService);
//# sourceMappingURL=auth.service.js.map