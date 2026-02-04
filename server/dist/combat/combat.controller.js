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
exports.CombatController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const auth_guard_1 = require("../auth/auth.guard");
const current_user_decorator_1 = require("../shared/decorators/current-user.decorator");
const combat_service_1 = require("./combat.service");
const tap_dto_1 = require("./dto/tap.dto");
let CombatController = class CombatController {
    combatService;
    constructor(combatService) {
        this.combatService = combatService;
    }
    async tap(telegramId, dto) {
        return this.combatService.processTap(telegramId, dto.sessionId);
    }
    async complete(telegramId, dto) {
        return this.combatService.completeSession(telegramId, dto.sessionId);
    }
    async flee(telegramId, dto) {
        return this.combatService.fleeCombat(telegramId, dto.sessionId);
    }
};
exports.CombatController = CombatController;
__decorate([
    (0, common_1.Post)('tap'),
    (0, throttler_1.Throttle)({ default: { ttl: 1000, limit: 20 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Process a tap (server-authoritative damage)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('telegramId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, tap_dto_1.TapDto]),
    __metadata("design:returntype", Promise)
], CombatController.prototype, "tap", null);
__decorate([
    (0, common_1.Post)('complete'),
    (0, swagger_1.ApiOperation)({ summary: 'Complete combat session and claim rewards' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('telegramId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, tap_dto_1.TapDto]),
    __metadata("design:returntype", Promise)
], CombatController.prototype, "complete", null);
__decorate([
    (0, common_1.Post)('flee'),
    (0, swagger_1.ApiOperation)({ summary: 'Abandon combat session' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('telegramId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, tap_dto_1.TapDto]),
    __metadata("design:returntype", Promise)
], CombatController.prototype, "flee", null);
exports.CombatController = CombatController = __decorate([
    (0, swagger_1.ApiTags)('combat'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('combat'),
    __metadata("design:paramtypes", [combat_service_1.CombatService])
], CombatController);
//# sourceMappingURL=combat.controller.js.map