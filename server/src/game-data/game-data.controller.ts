import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GameDataService } from './game-data.service';

@ApiTags('game-data')
@Controller('game-data')
export class GameDataController {
  constructor(private gameDataService: GameDataService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get balance constants' })
  async getBalance() {
    return this.gameDataService.getBalance();
  }

  @Get('version')
  @ApiOperation({ summary: 'Get game version info' })
  async getVersion() {
    return this.gameDataService.getVersion();
  }

  @Get('classes')
  @ApiOperation({ summary: 'Get available character classes' })
  async getClasses() {
    return this.gameDataService.getClasses();
  }

  @Get('endgame')
  @ApiOperation({ summary: 'Get endgame configuration' })
  async getEndgame() {
    return this.gameDataService.getEndgameConfig();
  }
}
