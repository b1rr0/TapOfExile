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
exports.MigrationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const player_entity_1 = require("../shared/entities/player.entity");
const character_entity_1 = require("../shared/entities/character.entity");
const bag_item_entity_1 = require("../shared/entities/bag-item.entity");
const balance_constants_1 = require("../shared/constants/balance.constants");
const VALID_CLASS_IDS = ['samurai', 'warrior', 'mage', 'archer'];
let MigrationService = class MigrationService {
    playerRepo;
    charRepo;
    bagRepo;
    constructor(playerRepo, charRepo, bagRepo) {
        this.playerRepo = playerRepo;
        this.charRepo = charRepo;
        this.bagRepo = bagRepo;
    }
    async importLocalSave(telegramId, gameData) {
        if (!gameData || typeof gameData !== 'object') {
            throw new common_1.BadRequestException('Invalid gameData format');
        }
        const migrated = this.migrateData(gameData);
        this.validateGameData(migrated);
        let player = await this.playerRepo.findOne({
            where: { telegramId },
        });
        if (!player) {
            player = this.playerRepo.create({
                telegramId,
                gold: String(migrated.gold || 0),
                activeCharacterId: migrated.activeCharacterId || null,
                totalTaps: String(migrated.meta?.totalTaps || 0),
                totalKills: String(migrated.meta?.totalKills || 0),
                totalGold: String(migrated.meta?.totalGold || 0),
                gameVersion: migrated.meta?.version || 4,
                lastSaveTime: String(migrated.meta?.lastSaveTime || Date.now()),
            });
        }
        else {
            const serverTime = Number(player.lastSaveTime);
            const clientTime = migrated.meta?.lastSaveTime || 0;
            if (clientTime <= serverTime) {
                return {
                    status: 'skipped',
                    reason: 'Server data is newer',
                    serverTime,
                    clientTime,
                };
            }
            player.gold = String(migrated.gold || 0);
            player.activeCharacterId = migrated.activeCharacterId || null;
            player.totalTaps = String(migrated.meta?.totalTaps || 0);
            player.totalKills = String(migrated.meta?.totalKills || 0);
            player.totalGold = String(migrated.meta?.totalGold || 0);
            player.gameVersion = migrated.meta?.version || 4;
            player.lastSaveTime = String(migrated.meta?.lastSaveTime || Date.now());
        }
        await this.playerRepo.save(player);
        const characters = migrated.characters || [];
        let importedChars = 0;
        for (const charData of characters) {
            if (!charData.id)
                continue;
            let char = await this.charRepo.findOne({
                where: { id: charData.id },
            });
            const charValues = {
                playerTelegramId: telegramId,
                nickname: charData.nickname || 'Hero',
                classId: charData.classId || 'samurai',
                skinId: charData.skinId || 'samurai_1',
                createdAt: String(charData.createdAt || Date.now()),
                level: charData.level || 1,
                xp: String(charData.xp || 0),
                xpToNext: String(charData.xpToNext || balance_constants_1.B.XP_BASE),
                tapDamage: charData.tapDamage || balance_constants_1.B.STARTING_STATS.tapDamage,
                critChance: charData.critChance || balance_constants_1.B.STARTING_STATS.critChance,
                critMultiplier: charData.critMultiplier || balance_constants_1.B.STARTING_STATS.critMultiplier,
                passiveDps: charData.passiveDps || balance_constants_1.B.STARTING_STATS.passiveDps,
                combatCurrentStage: charData.combat?.currentStage || 1,
                combatCurrentWave: charData.combat?.currentWave || 1,
                combatWavesPerStage: charData.combat?.wavesPerStage || 10,
                completedLocations: charData.locations?.completed || [],
                currentLocation: charData.locations?.current || null,
                currentAct: charData.locations?.currentAct || 1,
                equipment: charData.inventory?.equipment || {},
                endgameUnlocked: charData.endgame?.unlocked || false,
                completedBosses: charData.endgame?.completedBosses || [],
                highestTierCompleted: charData.endgame?.highestTierCompleted || 0,
                totalMapsRun: charData.endgame?.totalMapsRun || 0,
            };
            if (char) {
                Object.assign(char, charValues);
            }
            else {
                char = this.charRepo.create({ id: charData.id, ...charValues });
            }
            await this.charRepo.save(char);
            if (charData.bag && Array.isArray(charData.bag)) {
                await this.bagRepo.delete({ characterId: charData.id });
                for (const itemData of charData.bag.slice(0, 32)) {
                    if (!itemData.id)
                        continue;
                    const item = this.bagRepo.create({
                        id: itemData.id,
                        characterId: charData.id,
                        name: itemData.name || '',
                        type: itemData.type || 'map_key',
                        quality: itemData.quality || 'common',
                        level: itemData.level || null,
                        icon: itemData.icon || null,
                        acquiredAt: String(itemData.acquiredAt || Date.now()),
                        tier: itemData.tier || null,
                        locationId: itemData.locationId || null,
                        locationAct: itemData.locationAct || null,
                        bossId: itemData.bossId || null,
                        bossKeyTier: itemData.bossKeyTier || null,
                    });
                    await this.bagRepo.save(item);
                }
            }
            importedChars++;
        }
        return {
            status: 'imported',
            charactersImported: importedChars,
            gold: player.gold,
            version: player.gameVersion,
        };
    }
    migrateData(data) {
        let d = { ...data };
        if (d.player && !d.characters) {
            const p = d.player;
            const charId = `char_migrated_${Date.now()}`;
            d = {
                gold: p.gold || 0,
                activeCharacterId: charId,
                characters: [
                    {
                        id: charId,
                        nickname: 'Hero',
                        classId: 'samurai',
                        skinId: p.skinId || 'samurai_1',
                        createdAt: Date.now(),
                        level: p.level || 1,
                        xp: p.xp || 0,
                        xpToNext: p.xpToNext || 100,
                        tapDamage: p.tapDamage || 1,
                        critChance: p.critChance || 0.05,
                        critMultiplier: p.critMultiplier || 2.0,
                        passiveDps: p.passiveDps || 0,
                        combat: d.combat || { currentStage: 1, currentWave: 1, wavesPerStage: 10 },
                        locations: d.locations || { completed: [], current: null, currentAct: 1 },
                        inventory: d.inventory || { items: [], equipment: {} },
                        bag: [],
                        endgame: { unlocked: false, completedBosses: [], highestTierCompleted: 0, totalMapsRun: 0 },
                    },
                ],
                meta: d.meta || { lastSaveTime: Date.now(), totalTaps: 0, totalKills: 0, totalGold: 0, version: 2 },
            };
        }
        if (d.meta && d.meta.version < 3) {
            for (const char of (d.characters || [])) {
                if (char.locations) {
                    char.locations.completed = (char.locations.completed || []).map((id) => (id.startsWith('act') ? id : `act1_${id}`));
                    char.locations.currentAct = char.locations.currentAct || 1;
                }
            }
            d.meta.version = 3;
        }
        if (d.meta && d.meta.version < 4) {
            for (const char of (d.characters || [])) {
                if (!char.endgame) {
                    char.endgame = {
                        unlocked: false,
                        completedBosses: [],
                        highestTierCompleted: 0,
                        totalMapsRun: 0,
                    };
                }
                if (!char.bag)
                    char.bag = [];
            }
            d.meta.version = 4;
        }
        return d;
    }
    validateGameData(data) {
        if (typeof data.gold !== 'number' || data.gold < 0) {
            throw new common_1.BadRequestException('Invalid gold value');
        }
        for (const char of (data.characters || [])) {
            if (!char.id) {
                throw new common_1.BadRequestException('Character missing ID');
            }
            if (char.classId && !VALID_CLASS_IDS.includes(char.classId)) {
                throw new common_1.BadRequestException(`Invalid classId: ${char.classId}`);
            }
            if (char.level < 1 || char.level > 9999) {
                throw new common_1.BadRequestException(`Invalid level: ${char.level}`);
            }
        }
    }
};
exports.MigrationService = MigrationService;
exports.MigrationService = MigrationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(player_entity_1.Player)),
    __param(1, (0, typeorm_1.InjectRepository)(character_entity_1.Character)),
    __param(2, (0, typeorm_1.InjectRepository)(bag_item_entity_1.BagItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], MigrationService);
//# sourceMappingURL=migration.service.js.map