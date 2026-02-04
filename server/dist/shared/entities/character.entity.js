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
exports.Character = void 0;
const typeorm_1 = require("typeorm");
const player_entity_1 = require("./player.entity");
const bag_item_entity_1 = require("./bag-item.entity");
const skill_allocation_entity_1 = require("./skill-allocation.entity");
let Character = class Character {
    id;
    playerTelegramId;
    player;
    nickname;
    classId;
    skinId;
    createdAt;
    level;
    xp;
    xpToNext;
    tapDamage;
    critChance;
    critMultiplier;
    passiveDps;
    combatCurrentStage;
    combatCurrentWave;
    combatWavesPerStage;
    completedLocations;
    currentLocation;
    currentAct;
    equipment;
    endgameUnlocked;
    completedBosses;
    highestTierCompleted;
    totalMapsRun;
    bag;
    skillAllocations;
};
exports.Character = Character;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'varchar', length: 64 }),
    __metadata("design:type", String)
], Character.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint' }),
    __metadata("design:type", String)
], Character.prototype, "playerTelegramId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => player_entity_1.Player, (player) => player.characters, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'playerTelegramId' }),
    __metadata("design:type", player_entity_1.Player)
], Character.prototype, "player", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64 }),
    __metadata("design:type", String)
], Character.prototype, "nickname", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 32 }),
    __metadata("design:type", String)
], Character.prototype, "classId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64 }),
    __metadata("design:type", String)
], Character.prototype, "skinId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint' }),
    __metadata("design:type", String)
], Character.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], Character.prototype, "level", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', default: 0 }),
    __metadata("design:type", String)
], Character.prototype, "xp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', default: 100 }),
    __metadata("design:type", String)
], Character.prototype, "xpToNext", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], Character.prototype, "tapDamage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0.05 }),
    __metadata("design:type", Number)
], Character.prototype, "critChance", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 2.0 }),
    __metadata("design:type", Number)
], Character.prototype, "critMultiplier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Character.prototype, "passiveDps", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], Character.prototype, "combatCurrentStage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], Character.prototype, "combatCurrentWave", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 10 }),
    __metadata("design:type", Number)
], Character.prototype, "combatWavesPerStage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '[]' }),
    __metadata("design:type", Array)
], Character.prototype, "completedLocations", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 128, nullable: true }),
    __metadata("design:type", Object)
], Character.prototype, "currentLocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], Character.prototype, "currentAct", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '{}' }),
    __metadata("design:type", Object)
], Character.prototype, "equipment", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Character.prototype, "endgameUnlocked", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '[]' }),
    __metadata("design:type", Array)
], Character.prototype, "completedBosses", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Character.prototype, "highestTierCompleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Character.prototype, "totalMapsRun", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => bag_item_entity_1.BagItem, (item) => item.character, { cascade: true }),
    __metadata("design:type", Array)
], Character.prototype, "bag", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => skill_allocation_entity_1.SkillAllocation, (alloc) => alloc.character, { cascade: true }),
    __metadata("design:type", Array)
], Character.prototype, "skillAllocations", void 0);
exports.Character = Character = __decorate([
    (0, typeorm_1.Entity)('characters')
], Character);
//# sourceMappingURL=character.entity.js.map