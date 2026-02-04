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
exports.CombatService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const uuid_1 = require("uuid");
const redis_service_1 = require("../redis/redis.service");
const level_gen_service_1 = require("../level-gen/level-gen.service");
const character_entity_1 = require("../shared/entities/character.entity");
const player_entity_1 = require("../shared/entities/player.entity");
const combat_session_entity_1 = require("../shared/entities/combat-session.entity");
const balance_constants_1 = require("../shared/constants/balance.constants");
const SESSION_TTL = 1800;
const MIN_TAP_INTERVAL_MS = 50;
let CombatService = class CombatService {
    redis;
    levelGen;
    charRepo;
    playerRepo;
    sessionRepo;
    constructor(redis, levelGen, charRepo, playerRepo, sessionRepo) {
        this.redis = redis;
        this.levelGen = levelGen;
        this.charRepo = charRepo;
        this.playerRepo = playerRepo;
        this.sessionRepo = sessionRepo;
    }
    sessionKey(id) {
        return `combat:session:${id}`;
    }
    async startLocation(telegramId, locationId, waves, locationOrder, actNumber) {
        const player = await this.playerRepo.findOne({ where: { telegramId } });
        if (!player || !player.activeCharacterId) {
            throw new common_1.BadRequestException('No active character');
        }
        const queue = this.levelGen.buildMonsterQueue(waves, locationOrder, actNumber);
        const sessionId = (0, uuid_1.v4)();
        const session = {
            id: sessionId,
            playerId: telegramId,
            characterId: player.activeCharacterId,
            mode: 'location',
            monsterQueue: queue,
            currentIndex: 0,
            totalGoldEarned: 0,
            totalXpEarned: 0,
            totalTaps: 0,
            lastTapTime: 0,
            startedAt: Date.now(),
            locationId,
        };
        await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);
        return {
            sessionId,
            totalMonsters: queue.length,
            currentMonster: queue[0] || null,
        };
    }
    async startMap(telegramId, waves, tierHpMul, tierGoldMul, tierXpMul, mapTier, bossId) {
        const player = await this.playerRepo.findOne({ where: { telegramId } });
        if (!player || !player.activeCharacterId) {
            throw new common_1.BadRequestException('No active character');
        }
        const queue = this.levelGen.buildMonsterQueue(waves, undefined, undefined, tierHpMul, tierGoldMul, tierXpMul);
        const sessionId = (0, uuid_1.v4)();
        const session = {
            id: sessionId,
            playerId: telegramId,
            characterId: player.activeCharacterId,
            mode: bossId ? 'boss_map' : 'map',
            monsterQueue: queue,
            currentIndex: 0,
            totalGoldEarned: 0,
            totalXpEarned: 0,
            totalTaps: 0,
            lastTapTime: 0,
            startedAt: Date.now(),
            mapTier,
            bossId,
        };
        await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);
        return {
            sessionId,
            totalMonsters: queue.length,
            currentMonster: queue[0] || null,
        };
    }
    async processTap(telegramId, sessionId) {
        const session = await this.redis.getJson(this.sessionKey(sessionId));
        if (!session || session.playerId !== telegramId) {
            throw new common_1.NotFoundException('Combat session not found');
        }
        const now = Date.now();
        if (now - session.lastTapTime < MIN_TAP_INTERVAL_MS) {
            throw new common_1.BadRequestException('Tap too fast');
        }
        const char = await this.charRepo.findOne({
            where: { id: session.characterId },
        });
        if (!char)
            throw new common_1.NotFoundException('Character not found');
        const isCrit = Math.random() < char.critChance;
        let damage = char.tapDamage;
        if (isCrit) {
            damage = Math.floor(damage * char.critMultiplier);
        }
        const monster = session.monsterQueue[session.currentIndex];
        if (!monster) {
            throw new common_1.BadRequestException('No monster to attack');
        }
        monster.currentHp -= damage;
        session.totalTaps++;
        session.lastTapTime = now;
        let killed = false;
        let rewards = null;
        if (monster.currentHp <= 0) {
            monster.currentHp = 0;
            killed = true;
            session.totalGoldEarned += monster.goldReward;
            session.totalXpEarned += monster.xpReward;
            session.currentIndex++;
        }
        const isComplete = session.currentIndex >= session.monsterQueue.length;
        await this.redis.setJson(this.sessionKey(sessionId), session, SESSION_TTL);
        return {
            damage,
            isCrit,
            monsterHp: monster.currentHp,
            monsterMaxHp: monster.maxHp,
            killed,
            isComplete,
            currentMonster: !isComplete ? session.monsterQueue[session.currentIndex] : null,
            monstersRemaining: session.monsterQueue.length - session.currentIndex,
        };
    }
    async completeSession(telegramId, sessionId) {
        const session = await this.redis.getJson(this.sessionKey(sessionId));
        if (!session || session.playerId !== telegramId) {
            throw new common_1.NotFoundException('Combat session not found');
        }
        if (session.currentIndex < session.monsterQueue.length) {
            throw new common_1.BadRequestException('Not all monsters killed');
        }
        const player = await this.playerRepo.findOne({
            where: { telegramId },
        });
        if (!player)
            throw new common_1.NotFoundException('Player not found');
        player.gold = String(BigInt(player.gold) + BigInt(session.totalGoldEarned));
        player.totalGold = String(BigInt(player.totalGold) + BigInt(session.totalGoldEarned));
        player.totalKills = String(BigInt(player.totalKills) + BigInt(session.monsterQueue.length));
        player.totalTaps = String(BigInt(player.totalTaps) + BigInt(session.totalTaps));
        player.lastSaveTime = String(Date.now());
        await this.playerRepo.save(player);
        const char = await this.charRepo.findOne({
            where: { id: session.characterId },
        });
        if (char) {
            char.xp = String(BigInt(char.xp) + BigInt(session.totalXpEarned));
            let leveled = false;
            while (BigInt(char.xp) >= BigInt(char.xpToNext)) {
                char.xp = String(BigInt(char.xp) - BigInt(char.xpToNext));
                char.level++;
                char.xpToNext = String(Math.floor(balance_constants_1.B.XP_BASE * Math.pow(balance_constants_1.B.XP_GROWTH, char.level - 1)));
                leveled = true;
            }
            await this.charRepo.save(char);
        }
        const auditSession = this.sessionRepo.create({
            id: session.id,
            playerTelegramId: telegramId,
            characterId: session.characterId,
            mode: session.mode,
            locationId: session.locationId || null,
            mapTier: session.mapTier || null,
            bossId: session.bossId || null,
            totalMonsters: session.monsterQueue.length,
            monstersKilled: session.monsterQueue.length,
            totalGoldEarned: String(session.totalGoldEarned),
            totalXpEarned: String(session.totalXpEarned),
            totalTaps: session.totalTaps,
            completedAt: new Date(),
            status: 'completed',
        });
        await this.sessionRepo.save(auditSession);
        await this.redis.del(this.sessionKey(sessionId));
        return {
            totalGold: session.totalGoldEarned,
            totalXp: session.totalXpEarned,
            totalTaps: session.totalTaps,
            monstersKilled: session.monsterQueue.length,
            levelUp: char ? char.level : undefined,
        };
    }
    async fleeCombat(telegramId, sessionId) {
        const session = await this.redis.getJson(this.sessionKey(sessionId));
        if (!session || session.playerId !== telegramId) {
            throw new common_1.NotFoundException('Combat session not found');
        }
        await this.redis.del(this.sessionKey(sessionId));
        return { success: true };
    }
};
exports.CombatService = CombatService;
exports.CombatService = CombatService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(character_entity_1.Character)),
    __param(3, (0, typeorm_1.InjectRepository)(player_entity_1.Player)),
    __param(4, (0, typeorm_1.InjectRepository)(combat_session_entity_1.CombatSession)),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        level_gen_service_1.LevelGenService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CombatService);
//# sourceMappingURL=combat.service.js.map