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
exports.EndgameService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const character_entity_1 = require("../shared/entities/character.entity");
const loot_service_1 = require("../loot/loot.service");
const balance_constants_1 = require("../shared/constants/balance.constants");
const TOTAL_ACTS = 5;
let EndgameService = class EndgameService {
    charRepo;
    lootService;
    constructor(charRepo, lootService) {
        this.charRepo = charRepo;
        this.lootService = lootService;
    }
    async getStatus(telegramId, characterId) {
        const char = await this.charRepo.findOne({
            where: { id: characterId, playerTelegramId: telegramId },
        });
        if (!char)
            throw new common_1.NotFoundException('Character not found');
        return {
            unlocked: char.endgameUnlocked,
            completedBosses: char.completedBosses,
            highestTierCompleted: char.highestTierCompleted,
            totalMapsRun: char.totalMapsRun,
        };
    }
    async checkUnlock(telegramId, characterId) {
        const char = await this.charRepo.findOne({
            where: { id: characterId, playerTelegramId: telegramId },
        });
        if (!char)
            throw new common_1.NotFoundException('Character not found');
        if (char.endgameUnlocked) {
            return { unlocked: true, alreadyUnlocked: true };
        }
        const completed = new Set(char.completedLocations);
        let allComplete = true;
        for (let act = 1; act <= TOTAL_ACTS; act++) {
            for (let order = 1; order <= 8; order++) {
                const prefix = `act${act}_`;
                const hasAnyForOrder = char.completedLocations.some((loc) => loc.startsWith(prefix));
                if (!hasAnyForOrder && order <= 8) {
                }
            }
        }
        for (let act = 1; act <= TOTAL_ACTS; act++) {
            const prefix = `act${act}_`;
            const actLocations = char.completedLocations.filter((l) => l.startsWith(prefix));
            if (actLocations.length < 8) {
                allComplete = false;
                break;
            }
        }
        if (!allComplete) {
            return { unlocked: false };
        }
        char.endgameUnlocked = true;
        await this.charRepo.save(char);
        const starterKeys = [];
        for (let i = 0; i < balance_constants_1.B.ENDGAME_STARTER_KEYS; i++) {
            starterKeys.push({
                id: `map_t${balance_constants_1.B.ENDGAME_STARTER_TIER}_starter_${Date.now()}_${i}`,
                name: `Starter Map Key`,
                type: 'map_key',
                tier: balance_constants_1.B.ENDGAME_STARTER_TIER,
                quality: 'common',
                level: balance_constants_1.B.ENDGAME_STARTER_TIER,
                icon: '\uD83D\uDDFA\uFE0F',
                acquiredAt: String(Date.now()),
            });
        }
        await this.lootService.addItemsToBag(characterId, starterKeys);
        return {
            unlocked: true,
            alreadyUnlocked: false,
            starterKeys: starterKeys.length,
        };
    }
    async recordBossCompletion(characterId, bossId, mapTier) {
        const char = await this.charRepo.findOne({
            where: { id: characterId },
        });
        if (!char)
            return;
        if (!char.completedBosses.includes(bossId)) {
            char.completedBosses = [...char.completedBosses, bossId];
        }
        if (mapTier > char.highestTierCompleted) {
            char.highestTierCompleted = mapTier;
        }
        char.totalMapsRun++;
        await this.charRepo.save(char);
    }
};
exports.EndgameService = EndgameService;
exports.EndgameService = EndgameService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(character_entity_1.Character)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        loot_service_1.LootService])
], EndgameService);
//# sourceMappingURL=endgame.service.js.map