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
exports.LootController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_guard_1 = require("../auth/auth.guard");
const current_user_decorator_1 = require("../shared/decorators/current-user.decorator");
const loot_service_1 = require("./loot.service");
let LootController = class LootController {
    lootService;
    constructor(lootService) {
        this.lootService = lootService;
    }
    async getBag(telegramId, characterId) {
        return this.lootService.getBag(telegramId, characterId);
    }
    async discardItem(characterId, itemId) {
        await this.lootService.removeItem(characterId, itemId);
        return { success: true };
    }
};
exports.LootController = LootController;
__decorate([
    (0, common_1.Get)('bag'),
    (0, swagger_1.ApiOperation)({ summary: 'Get bag contents for active character' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('telegramId')),
    __param(1, (0, common_1.Query)('characterId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LootController.prototype, "getBag", null);
__decorate([
    (0, common_1.Delete)('bag/:itemId'),
    (0, swagger_1.ApiOperation)({ summary: 'Discard item from bag' }),
    __param(0, (0, common_1.Query)('characterId')),
    __param(1, (0, common_1.Param)('itemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LootController.prototype, "discardItem", null);
exports.LootController = LootController = __decorate([
    (0, swagger_1.ApiTags)('loot'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('loot'),
    __metadata("design:paramtypes", [loot_service_1.LootService])
], LootController);
//# sourceMappingURL=loot.controller.js.map