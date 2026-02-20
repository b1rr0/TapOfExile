import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { CharacterService } from './character.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { ChangeSkinDto } from './dto/change-skin.dto';

@ApiTags('characters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('characters')
export class CharacterController {
  constructor(private characterService: CharacterService) {}

  @Get()
  @ApiOperation({ summary: 'List all characters' })
  @ApiResponse({ status: 200, description: 'Array of characters' })
  async listCharacters(@CurrentUser('telegramId') telegramId: string) {
    return this.characterService.listCharacters(telegramId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new character' })
  @ApiResponse({ status: 201, description: 'Created character' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createCharacter(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: CreateCharacterDto,
  ) {
    return this.characterService.createCharacter(telegramId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get character by ID' })
  @ApiResponse({ status: 200, description: 'Character details' })
  @ApiResponse({ status: 404, description: 'Character not found' })
  async getCharacter(
    @CurrentUser('telegramId') telegramId: string,
    @Param('id') charId: string,
  ) {
    return this.characterService.getCharacter(telegramId, charId);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Set active character' })
  @ApiResponse({ status: 201, description: 'Character activated' })
  @ApiResponse({ status: 404, description: 'Character not found' })
  async activateCharacter(
    @CurrentUser('telegramId') telegramId: string,
    @Param('id') charId: string,
  ) {
    return this.characterService.activateCharacter(telegramId, charId);
  }

  @Put(':id/skin')
  @ApiOperation({ summary: 'Change character skin' })
  @ApiResponse({ status: 200, description: 'Skin changed' })
  @ApiResponse({ status: 400, description: 'Invalid skin ID' })
  async changeSkin(
    @CurrentUser('telegramId') telegramId: string,
    @Param('id') charId: string,
    @Body() dto: ChangeSkinDto,
  ) {
    return this.characterService.changeSkin(telegramId, charId, dto.skinId);
  }
}
