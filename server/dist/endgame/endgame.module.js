"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndgameModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const endgame_controller_1 = require("./endgame.controller");
const endgame_service_1 = require("./endgame.service");
const character_entity_1 = require("../shared/entities/character.entity");
const loot_module_1 = require("../loot/loot.module");
let EndgameModule = class EndgameModule {
};
exports.EndgameModule = EndgameModule;
exports.EndgameModule = EndgameModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([character_entity_1.Character]), loot_module_1.LootModule],
        controllers: [endgame_controller_1.EndgameController],
        providers: [endgame_service_1.EndgameService],
        exports: [endgame_service_1.EndgameService],
    })
], EndgameModule);
//# sourceMappingURL=endgame.module.js.map