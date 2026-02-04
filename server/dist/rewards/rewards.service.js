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
exports.RewardsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const daily_reward_entity_1 = require("../shared/entities/daily-reward.entity");
const player_entity_1 = require("../shared/entities/player.entity");
const redis_service_1 = require("../redis/redis.service");
const reward_definitions_1 = require("./reward-definitions");
let RewardsService = class RewardsService {
    dailyRepo;
    playerRepo;
    redis;
    constructor(dailyRepo, playerRepo, redis) {
        this.dailyRepo = dailyRepo;
        this.playerRepo = playerRepo;
        this.redis = redis;
    }
    async getDailyRewardInfo(telegramId) {
        const streak = await this.getStreak(telegramId);
        const now = Date.now();
        const hoursSinceLastClaim = streak.lastClaimTime
            ? (now - streak.lastClaimTime) / (1000 * 60 * 60)
            : 999;
        const canClaim = hoursSinceLastClaim >= 24;
        const currentDay = canClaim ? streak.day : streak.day;
        const rewardIndex = ((currentDay - 1) % 30);
        const reward = reward_definitions_1.DAILY_REWARD_TABLE[rewardIndex];
        return {
            day: currentDay,
            streak: streak.day,
            canClaim,
            hoursUntilClaim: canClaim ? 0 : Math.max(0, 24 - hoursSinceLastClaim),
            reward: reward || reward_definitions_1.DAILY_REWARD_TABLE[0],
        };
    }
    async claimDailyReward(telegramId) {
        const streak = await this.getStreak(telegramId);
        const now = Date.now();
        const hoursSinceLastClaim = streak.lastClaimTime
            ? (now - streak.lastClaimTime) / (1000 * 60 * 60)
            : 999;
        if (hoursSinceLastClaim < 24) {
            throw new common_1.BadRequestException('Daily reward not ready yet');
        }
        let newDay = streak.day;
        if (hoursSinceLastClaim > 48) {
            newDay = 1;
        }
        const rewardIndex = ((newDay - 1) % 30);
        const reward = reward_definitions_1.DAILY_REWARD_TABLE[rewardIndex] || reward_definitions_1.DAILY_REWARD_TABLE[0];
        const record = this.dailyRepo.create({
            playerTelegramId: telegramId,
            day: newDay,
            rewardType: reward.type,
            rewardData: reward.data,
        });
        await this.dailyRepo.save(record);
        if (reward.type === 'gold' && reward.data.amount) {
            const player = await this.playerRepo.findOne({
                where: { telegramId },
            });
            if (player) {
                player.gold = String(BigInt(player.gold) + BigInt(reward.data.amount));
                await this.playerRepo.save(player);
            }
        }
        const nextDay = newDay + 1;
        await this.setStreak(telegramId, {
            day: nextDay > 30 ? 1 : nextDay,
            lastClaimTime: now,
        });
        return {
            claimed: reward,
            nextDay: nextDay > 30 ? 1 : nextDay,
            streak: newDay,
        };
    }
    async getAchievements() {
        return reward_definitions_1.ACHIEVEMENTS;
    }
    async getStreak(telegramId) {
        const data = await this.redis.getJson(`daily:streak:${telegramId}`);
        return data || { day: 1, lastClaimTime: 0 };
    }
    async setStreak(telegramId, streak) {
        await this.redis.setJson(`daily:streak:${telegramId}`, streak, 49 * 24 * 3600);
    }
};
exports.RewardsService = RewardsService;
exports.RewardsService = RewardsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(daily_reward_entity_1.DailyReward)),
    __param(1, (0, typeorm_1.InjectRepository)(player_entity_1.Player)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        redis_service_1.RedisService])
], RewardsService);
//# sourceMappingURL=rewards.service.js.map