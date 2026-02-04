"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillTreeModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const skill_tree_controller_1 = require("./skill-tree.controller");
const skill_tree_service_1 = require("./skill-tree.service");
const skill_allocation_entity_1 = require("../shared/entities/skill-allocation.entity");
const character_entity_1 = require("../shared/entities/character.entity");
const player_entity_1 = require("../shared/entities/player.entity");
let SkillTreeModule = class SkillTreeModule {
};
exports.SkillTreeModule = SkillTreeModule;
exports.SkillTreeModule = SkillTreeModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([skill_allocation_entity_1.SkillAllocation, character_entity_1.Character, player_entity_1.Player])],
        controllers: [skill_tree_controller_1.SkillTreeController],
        providers: [skill_tree_service_1.SkillTreeService],
        exports: [skill_tree_service_1.SkillTreeService],
    })
], SkillTreeModule);
//# sourceMappingURL=skill-tree.module.js.map