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
exports.LootService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bag_item_entity_1 = require("../shared/entities/bag-item.entity");
const character_entity_1 = require("../shared/entities/character.entity");
const MAX_BAG_SIZE = 32;
const DROP_SETTINGS = {
    regular: {
        sameTierChance: 0.60,
        tierUpChance: 0.20,
        bossKeyChance: 0.05,
        bossKeyMinTier: 5,
    },
    boss: {
        guaranteedTierMin: 5,
        guaranteedTierMax: 8,
        bonusKeyChance: 0.30,
        bossKeyChance: 0.05,
    },
};
const MAX_TIER = 10;
const BOSS_MAPS = [
    'boss_shadow_shogun', 'boss_ancient_dragon', 'boss_demon_oni',
    'boss_wind_tengu', 'boss_phantom_ronin', 'boss_forest_guardian',
    'boss_beast_king', 'boss_bandit_lord',
];
const BOSS_KEY_TIERS = [
    { tier: 1, quality: 'boss_silver' },
    { tier: 2, quality: 'boss_gold' },
    { tier: 3, quality: 'boss_red' },
];
function tierQuality(tier) {
    if (tier <= 3)
        return 'common';
    if (tier <= 6)
        return 'rare';
    if (tier <= 9)
        return 'epic';
    return 'legendary';
}
function pickBossKeyTier(sourceTier, isBossMap) {
    if (isBossMap)
        return 3;
    if (sourceTier >= 9)
        return 3;
    if (sourceTier >= 7)
        return 2;
    return 1;
}
function uid() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}
let LootService = class LootService {
    bagRepo;
    charRepo;
    constructor(bagRepo, charRepo) {
        this.bagRepo = bagRepo;
        this.charRepo = charRepo;
    }
    async getBag(telegramId, characterId) {
        return this.bagRepo.find({ where: { characterId } });
    }
    rollMapDrops(tier, isBossMap = false, direction = null) {
        const drops = [];
        const S = DROP_SETTINGS;
        if (isBossMap) {
            const range = S.boss.guaranteedTierMax - S.boss.guaranteedTierMin + 1;
            const dropTier = Math.min(MAX_TIER, Math.floor(Math.random() * range) + S.boss.guaranteedTierMin);
            drops.push(this.createMapKeyData(dropTier));
            if (Math.random() < S.boss.bonusKeyChance) {
                drops.push(this.createMapKeyData(Math.min(MAX_TIER, dropTier + 1)));
            }
            if (Math.random() < S.boss.bossKeyChance) {
                const bkt = pickBossKeyTier(tier, true);
                const bossId = direction || BOSS_MAPS[Math.floor(Math.random() * BOSS_MAPS.length)];
                drops.push(this.createBossKeyData(bossId, bkt));
            }
            return drops;
        }
        if (Math.random() < S.regular.sameTierChance) {
            drops.push(this.createMapKeyData(tier));
        }
        if (tier < MAX_TIER && Math.random() < S.regular.tierUpChance) {
            drops.push(this.createMapKeyData(Math.min(MAX_TIER, tier + 1)));
        }
        if (tier >= S.regular.bossKeyMinTier && Math.random() < S.regular.bossKeyChance) {
            const bkt = pickBossKeyTier(tier, false);
            const bossId = direction || BOSS_MAPS[Math.floor(Math.random() * BOSS_MAPS.length)];
            drops.push(this.createBossKeyData(bossId, bkt));
        }
        return drops;
    }
    createMapKeyData(tier) {
        return {
            id: `map_t${tier}_${uid()}`,
            name: `Tier ${tier} Map Key`,
            type: 'map_key',
            tier,
            quality: tierQuality(tier),
            level: tier,
            icon: '\uD83D\uDDFA\uFE0F',
            acquiredAt: String(Date.now()),
        };
    }
    createBossKeyData(bossId, bossKeyTier) {
        const bkt = BOSS_KEY_TIERS[Math.min(bossKeyTier - 1, 2)];
        return {
            id: `bosskey_${bossId}_t${bossKeyTier}_${uid()}`,
            name: bossId,
            type: 'boss_map_key',
            bossId,
            bossKeyTier,
            quality: bkt.quality,
            level: bossKeyTier,
            icon: '\uD83D\uDC80',
            acquiredAt: String(Date.now()),
        };
    }
    async addItemsToBag(characterId, items) {
        const currentCount = await this.bagRepo.count({ where: { characterId } });
        const space = MAX_BAG_SIZE - currentCount;
        const toAdd = items.slice(0, space).map((item) => this.bagRepo.create({ ...item, characterId }));
        return this.bagRepo.save(toAdd);
    }
    async removeItem(characterId, itemId) {
        const item = await this.bagRepo.findOne({
            where: { id: itemId, characterId },
        });
        if (!item)
            throw new common_1.NotFoundException('Item not found in bag');
        await this.bagRepo.remove(item);
    }
};
exports.LootService = LootService;
exports.LootService = LootService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(bag_item_entity_1.BagItem)),
    __param(1, (0, typeorm_1.InjectRepository)(character_entity_1.Character)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], LootService);
//# sourceMappingURL=loot.service.js.map