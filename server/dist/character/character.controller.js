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
exports.CharacterController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_guard_1 = require("../auth/auth.guard");
const current_user_decorator_1 = require("../shared/decorators/current-user.decorator");
const character_service_1 = require("./character.service");
const create_character_dto_1 = require("./dto/create-character.dto");
let CharacterController = class CharacterController {
    characterService;
    constructor(characterService) {
        this.characterService = characterService;
    }
    async listCharacters(telegramId) {
        return this.characterService.listCharacters(telegramId);
    }
    async createCharacter(telegramId, dto) {
        return this.characterService.createCharacter(telegramId, dto);
    }
    async getCharacter(telegramId, charId) {
        return this.characterService.getCharacter(telegramId, charId);
    }
    async activateCharacter(telegramId, charId) {
        return this.characterService.activateCharacter(telegramId, charId);
    }
    async changeSkin(telegramId, charId, skinId) {
        return this.characterService.changeSkin(telegramId, charId, skinId);
    }
};
exports.CharacterController = CharacterController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all characters' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('telegramId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CharacterController.prototype, "listCharacters", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new character' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('telegramId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_character_dto_1.CreateCharacterDto]),
    __metadata("design:returntype", Promise)
], CharacterController.prototype, "createCharacter", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get character by ID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('telegramId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CharacterController.prototype, "getCharacter", null);
__decorate([
    (0, common_1.Post)(':id/activate'),
    (0, swagger_1.ApiOperation)({ summary: 'Set active character' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('telegramId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CharacterController.prototype, "activateCharacter", null);
__decorate([
    (0, common_1.Put)(':id/skin'),
    (0, swagger_1.ApiOperation)({ summary: 'Change character skin' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('telegramId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('skinId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CharacterController.prototype, "changeSkin", null);
exports.CharacterController = CharacterController = __decorate([
    (0, swagger_1.ApiTags)('characters'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('characters'),
    __metadata("design:paramtypes", [character_service_1.CharacterService])
], CharacterController);
//# sourceMappingURL=character.controller.js.map