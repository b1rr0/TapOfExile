import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { SkillTreeService } from './skill-tree.service';
import { AcceptAllocationsDto, ResetAllocationsDto } from './dto/accept-allocations.dto';
import { CharacterIdQueryDto } from '../shared/dto/character-id-query.dto';

@ApiTags('skill-tree')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('skill-tree')
export class SkillTreeController {
  constructor(private skillTreeService: SkillTreeService) {}

  @Get()
  @ApiOperation({ summary: 'Get skill tree allocations for a character' })
  @ApiResponse({ status: 200, description: 'Allocated node indices' })
  async getAllocations(
    @CurrentUser('telegramId') telegramId: string,
    @Query() query: CharacterIdQueryDto,
  ) {
    return this.skillTreeService.getAllocations(telegramId, query.characterId);
  }

  @Post('accept')
  @ApiOperation({ summary: 'Accept (bulk save) skill allocations' })
  @ApiResponse({ status: 201, description: 'Allocations saved' })
  @ApiResponse({ status: 400, description: 'Invalid allocations' })
  async accept(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: AcceptAllocationsDto,
  ) {
    return this.skillTreeService.acceptAllocations(
      telegramId,
      dto.characterId,
      dto.allocated,
    );
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset all skill allocations (costs gold)' })
  @ApiResponse({ status: 201, description: 'Allocations reset, gold deducted' })
  @ApiResponse({ status: 400, description: 'Not enough gold' })
  async reset(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: ResetAllocationsDto,
  ) {
    return this.skillTreeService.resetAllocations(telegramId, dto.characterId);
  }
}
