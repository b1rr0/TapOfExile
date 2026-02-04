import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { CharacterService } from './character.service';
import { CreateCharacterDto } from './dto/create-character.dto';

@ApiTags('characters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('characters')
export class CharacterController {
  constructor(private characterService: CharacterService) {}

  @Get()
  @ApiOperation({ summary: 'List all characters' })
  async listCharacters(@CurrentUser('telegramId') telegramId: string) {
    return this.characterService.listCharacters(telegramId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new character' })
  async createCharacter(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: CreateCharacterDto,
  ) {
    return this.characterService.createCharacter(telegramId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get character by ID' })
  async getCharacter(
    @CurrentUser('telegramId') telegramId: string,
    @Param('id') charId: string,
  ) {
    return this.characterService.getCharacter(telegramId, charId);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Set active character' })
  async activateCharacter(
    @CurrentUser('telegramId') telegramId: string,
    @Param('id') charId: string,
  ) {
    return this.characterService.activateCharacter(telegramId, charId);
  }

  @Put(':id/skin')
  @ApiOperation({ summary: 'Change character skin' })
  async changeSkin(
    @CurrentUser('telegramId') telegramId: string,
    @Param('id') charId: string,
    @Body('skinId') skinId: string,
  ) {
    return this.characterService.changeSkin(telegramId, charId, skinId);
  }
}
