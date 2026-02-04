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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameDataService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../redis/redis.service");
const balance_constants_1 = require("../shared/constants/balance.constants");
const game_version_1 = require("../shared/constants/game-version");
const CACHE_TTL = 3600;
let GameDataService = class GameDataService {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    async onModuleInit() {
        await this.cacheBalance();
        await this.cacheVersion();
    }
    async cacheBalance() {
        await this.redis.setJson('config:balance', balance_constants_1.B, CACHE_TTL);
    }
    async cacheVersion() {
        await this.redis.setJson('config:version', { version: game_version_1.GAME_VERSION, minClientVersion: game_version_1.MIN_CLIENT_VERSION }, CACHE_TTL);
    }
    async getBalance() {
        const cached = await this.redis.getJson('config:balance');
        if (cached)
            return cached;
        await this.cacheBalance();
        return balance_constants_1.B;
    }
    async getVersion() {
        return {
            version: game_version_1.GAME_VERSION,
            minClientVersion: game_version_1.MIN_CLIENT_VERSION,
        };
    }
    async getClasses() {
        return [
            { id: 'samurai', name: 'Samurai', skinId: 'samurai_1', description: 'Swift blade warrior', icon: '\u2694\uFE0F' },
            { id: 'warrior', name: 'Warrior', skinId: 'knight_1', description: 'Armored frontline fighter', icon: '\uD83D\uDEE1\uFE0F' },
            { id: 'mage', name: 'Mage', skinId: 'wizard_1', description: 'Master of arcane arts', icon: '\uD83E\uDDD9' },
            { id: 'archer', name: 'Archer', skinId: 'archer_1', description: 'Precision ranged attacker', icon: '\uD83C\uDFF9' },
        ];
    }
    async getEndgameConfig() {
        return {
            tiers: [
                { tier: 1, name: 'Tier I', hpMul: 1.0, goldMul: 1.0, xpMul: 1.0 },
                { tier: 2, name: 'Tier II', hpMul: 1.5, goldMul: 1.4, xpMul: 1.3 },
                { tier: 3, name: 'Tier III', hpMul: 2.2, goldMul: 1.9, xpMul: 1.7 },
                { tier: 4, name: 'Tier IV', hpMul: 3.2, goldMul: 2.5, xpMul: 2.2 },
                { tier: 5, name: 'Tier V', hpMul: 4.5, goldMul: 3.2, xpMul: 2.8 },
                { tier: 6, name: 'Tier VI', hpMul: 6.5, goldMul: 4.2, xpMul: 3.5 },
                { tier: 7, name: 'Tier VII', hpMul: 9.0, goldMul: 5.5, xpMul: 4.5 },
                { tier: 8, name: 'Tier VIII', hpMul: 13.0, goldMul: 7.2, xpMul: 5.8 },
                { tier: 9, name: 'Tier IX', hpMul: 18.0, goldMul: 9.5, xpMul: 7.5 },
                { tier: 10, name: 'Tier X', hpMul: 25.0, goldMul: 13.0, xpMul: 10.0 },
            ],
            dropSettings: {
                regular: { sameTierChance: 0.60, tierUpChance: 0.20, bossKeyChance: 0.05, bossKeyMinTier: 5 },
                boss: { guaranteedTierMin: 5, guaranteedTierMax: 8, bonusKeyChance: 0.30, bossKeyChance: 0.05 },
            },
            bossKeyTiers: [
                { tier: 1, name: 'Standard', quality: 'boss_silver', hpScale: 1.0, goldScale: 1.0, xpScale: 1.0 },
                { tier: 2, name: 'Empowered', quality: 'boss_gold', hpScale: 1.8, goldScale: 2.0, xpScale: 1.8 },
                { tier: 3, name: 'Mythic', quality: 'boss_red', hpScale: 3.0, goldScale: 3.5, xpScale: 3.0 },
            ],
        };
    }
};
exports.GameDataService = GameDataService;
exports.GameDataService = GameDataService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], GameDataService);
//# sourceMappingURL=game-data.service.js.map