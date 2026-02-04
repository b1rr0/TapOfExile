import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { SkillTreeService } from './skill-tree.service';

@ApiTags('skill-tree')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('skill-tree')
export class SkillTreeController {
  constructor(private skillTreeService: SkillTreeService) {}

  @Get()
  @ApiOperation({ summary: 'Get skill tree with allocations' })
  async getTree(
    @CurrentUser('telegramId') telegramId: string,
    @Query('characterId') characterId: string,
  ) {
    return this.skillTreeService.getTreeWithAllocations(
      telegramId,
      characterId,
    );
  }

  @Post('allocate')
  @ApiOperation({ summary: 'Allocate a skill node' })
  async allocate(
    @CurrentUser('telegramId') telegramId: string,
    @Body('characterId') characterId: string,
    @Body('nodeId') nodeId: number,
  ) {
    return this.skillTreeService.allocateNode(
      telegramId,
      characterId,
      nodeId,
    );
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset all skill allocations (costs gold)' })
  async reset(
    @CurrentUser('telegramId') telegramId: string,
    @Body('characterId') characterId: string,
  ) {
    return this.skillTreeService.resetAllocations(telegramId, characterId);
  }
}
