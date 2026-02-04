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
exports.MigrationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_guard_1 = require("../auth/auth.guard");
const current_user_decorator_1 = require("../shared/decorators/current-user.decorator");
const migration_service_1 = require("./migration.service");
const import_local_dto_1 = require("./dto/import-local.dto");
let MigrationController = class MigrationController {
    migrationService;
    constructor(migrationService) {
        this.migrationService = migrationService;
    }
    async importLocal(telegramId, dto) {
        return this.migrationService.importLocalSave(telegramId, dto.gameData);
    }
};
exports.MigrationController = MigrationController;
__decorate([
    (0, common_1.Post)('import-local'),
    (0, swagger_1.ApiOperation)({ summary: 'Import localStorage save to server' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('telegramId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, import_local_dto_1.ImportLocalDto]),
    __metadata("design:returntype", Promise)
], MigrationController.prototype, "importLocal", null);
exports.MigrationController = MigrationController = __decorate([
    (0, swagger_1.ApiTags)('migration'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('migration'),
    __metadata("design:paramtypes", [migration_service_1.MigrationService])
], MigrationController);
//# sourceMappingURL=migration.controller.js.map