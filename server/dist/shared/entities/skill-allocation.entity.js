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
exports.SkillAllocation = void 0;
const typeorm_1 = require("typeorm");
const character_entity_1 = require("./character.entity");
let SkillAllocation = class SkillAllocation {
    id;
    characterId;
    character;
    nodeId;
    allocatedAt;
};
exports.SkillAllocation = SkillAllocation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], SkillAllocation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64 }),
    __metadata("design:type", String)
], SkillAllocation.prototype, "characterId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => character_entity_1.Character, (char) => char.skillAllocations, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'characterId' }),
    __metadata("design:type", character_entity_1.Character)
], SkillAllocation.prototype, "character", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], SkillAllocation.prototype, "nodeId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SkillAllocation.prototype, "allocatedAt", void 0);
exports.SkillAllocation = SkillAllocation = __decorate([
    (0, typeorm_1.Entity)('skill_allocations'),
    (0, typeorm_1.Unique)(['characterId', 'nodeId'])
], SkillAllocation);
//# sourceMappingURL=skill-allocation.entity.js.map