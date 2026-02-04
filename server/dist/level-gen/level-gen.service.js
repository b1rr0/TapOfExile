"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LevelGenService = void 0;
const common_1 = require("@nestjs/common");
const balance_constants_1 = require("../shared/constants/balance.constants");
const monster_types_1 = require("./monster-types");
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
let LevelGenService = class LevelGenService {
    createMonsterForLocation(typeName, locationOrder, rarityId = 'common', actNumber = 1) {
        const type = monster_types_1.MONSTER_TYPES.find((m) => m.name === typeName) || monster_types_1.MONSTER_TYPES[0];
        const rarity = monster_types_1.RARITIES[rarityId] || monster_types_1.RARITIES.common;
        const actMul = Math.pow(balance_constants_1.B.ACT_SCALING_BASE, actNumber - 1);
        const hpScale = Math.pow(balance_constants_1.B.MONSTER_HP_GROWTH, locationOrder - 1);
        const baseHp = Math.floor(balance_constants_1.B.MONSTER_HP_BASE * hpScale * rarity.hpMul * actMul);
        const hpMin = Math.max(1, Math.floor(baseHp * (1 - balance_constants_1.B.MONSTER_HP_RANDOM)));
        const hpMax = Math.ceil(baseHp * (1 + balance_constants_1.B.MONSTER_HP_RANDOM));
        const hp = randInt(hpMin, hpMax);
        const goldScale = Math.pow(balance_constants_1.B.MONSTER_GOLD_GROWTH, locationOrder - 1);
        const gold = Math.floor(balance_constants_1.B.MONSTER_GOLD_BASE * goldScale * rarity.goldMul * actMul);
        const xpScale = Math.pow(balance_constants_1.B.MONSTER_XP_GROWTH, locationOrder - 1);
        const xp = Math.floor(balance_constants_1.B.MONSTER_XP_BASE * xpScale * rarity.xpMul * actMul);
        return {
            name: type.name,
            type: type.name,
            rarity,
            maxHp: hp,
            currentHp: hp,
            goldReward: gold,
            xpReward: xp,
        };
    }
    createMonsterForMap(typeName, rarityId, tierHpMul, tierGoldMul, tierXpMul) {
        const type = monster_types_1.MONSTER_TYPES.find((m) => m.name === typeName) || monster_types_1.MONSTER_TYPES[0];
        const rarity = monster_types_1.RARITIES[rarityId] || monster_types_1.RARITIES.common;
        const actMul = Math.pow(balance_constants_1.B.ACT_SCALING_BASE, balance_constants_1.B.MAP_BASE_ACT - 1);
        const orderScale = balance_constants_1.B.MAP_BASE_ORDER;
        const hpScale = Math.pow(balance_constants_1.B.MONSTER_HP_GROWTH, orderScale - 1);
        const baseHp = Math.floor(balance_constants_1.B.MONSTER_HP_BASE * hpScale * rarity.hpMul * actMul * tierHpMul);
        const hpMin = Math.max(1, Math.floor(baseHp * (1 - balance_constants_1.B.MONSTER_HP_RANDOM)));
        const hpMax = Math.ceil(baseHp * (1 + balance_constants_1.B.MONSTER_HP_RANDOM));
        const hp = randInt(hpMin, hpMax);
        const goldScale = Math.pow(balance_constants_1.B.MONSTER_GOLD_GROWTH, orderScale - 1);
        const gold = Math.floor(balance_constants_1.B.MONSTER_GOLD_BASE * goldScale * rarity.goldMul * actMul * tierGoldMul);
        const xpScale = Math.pow(balance_constants_1.B.MONSTER_XP_GROWTH, orderScale - 1);
        const xp = Math.floor(balance_constants_1.B.MONSTER_XP_BASE * xpScale * rarity.xpMul * actMul * tierXpMul);
        return {
            name: type.name,
            type: type.name,
            rarity,
            maxHp: hp,
            currentHp: hp,
            goldReward: gold,
            xpReward: xp,
        };
    }
    buildMonsterQueue(waves, locationOrder, actNumber, tierHpMul, tierGoldMul, tierXpMul) {
        const queue = [];
        const isMap = tierHpMul !== undefined;
        for (const wave of waves) {
            for (const spawn of wave.monsters) {
                for (let i = 0; i < spawn.count; i++) {
                    if (isMap) {
                        queue.push(this.createMonsterForMap(spawn.type, spawn.rarity, tierHpMul, tierGoldMul, tierXpMul));
                    }
                    else {
                        queue.push(this.createMonsterForLocation(spawn.type, locationOrder, spawn.rarity, actNumber));
                    }
                }
            }
        }
        return queue;
    }
};
exports.LevelGenService = LevelGenService;
exports.LevelGenService = LevelGenService = __decorate([
    (0, common_1.Injectable)()
], LevelGenService);
//# sourceMappingURL=level-gen.service.js.map