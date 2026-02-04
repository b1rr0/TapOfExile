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
exports.GameDataController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const game_data_service_1 = require("./game-data.service");
let GameDataController = class GameDataController {
    gameDataService;
    constructor(gameDataService) {
        this.gameDataService = gameDataService;
    }
    async getBalance() {
        return this.gameDataService.getBalance();
    }
    async getVersion() {
        return this.gameDataService.getVersion();
    }
    async getClasses() {
        return this.gameDataService.getClasses();
    }
    async getEndgame() {
        return this.gameDataService.getEndgameConfig();
    }
};
exports.GameDataController = GameDataController;
__decorate([
    (0, common_1.Get)('balance'),
    (0, swagger_1.ApiOperation)({ summary: 'Get balance constants' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GameDataController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Get)('version'),
    (0, swagger_1.ApiOperation)({ summary: 'Get game version info' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GameDataController.prototype, "getVersion", null);
__decorate([
    (0, common_1.Get)('classes'),
    (0, swagger_1.ApiOperation)({ summary: 'Get available character classes' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GameDataController.prototype, "getClasses", null);
__decorate([
    (0, common_1.Get)('endgame'),
    (0, swagger_1.ApiOperation)({ summary: 'Get endgame configuration' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GameDataController.prototype, "getEndgame", null);
exports.GameDataController = GameDataController = __decorate([
    (0, swagger_1.ApiTags)('game-data'),
    (0, common_1.Controller)('game-data'),
    __metadata("design:paramtypes", [game_data_service_1.GameDataService])
], GameDataController);
//# sourceMappingURL=game-data.controller.js.map