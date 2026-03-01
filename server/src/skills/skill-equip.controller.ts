import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { SkillEquipService } from './skill-equip.service';
import { EquipSkillDto, UnequipSkillDto, SkillsQueryDto } from './dto/skill-equip.dto';

@Controller('skills')
@UseGuards(JwtAuthGuard)
export class SkillEquipController {
  constructor(private readonly skillEquipService: SkillEquipService) {}

  @Get()
  async getEquipped(@Request() req: any, @Query() query: SkillsQueryDto) {
    return this.skillEquipService.getEquipped(
      req.user.telegramId,
      query.characterId,
    );
  }

  @Post('equip')
  async equip(@Request() req: any, @Body() dto: EquipSkillDto) {
    return this.skillEquipService.equipSkill(
      req.user.telegramId,
      dto.characterId,
      dto.slot,
      dto.skillId,
    );
  }

  @Post('unequip')
  async unequip(@Request() req: any, @Body() dto: UnequipSkillDto) {
    return this.skillEquipService.unequipSkill(
      req.user.telegramId,
      dto.characterId,
      dto.slot,
    );
  }
}
