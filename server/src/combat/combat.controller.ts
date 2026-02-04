import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { CombatService } from './combat.service';
import { TapDto } from './dto/tap.dto';

@ApiTags('combat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('combat')
export class CombatController {
  constructor(private combatService: CombatService) {}

  @Post('tap')
  @Throttle({ default: { ttl: 1000, limit: 20 } })
  @ApiOperation({ summary: 'Process a tap (server-authoritative damage)' })
  async tap(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: TapDto,
  ) {
    return this.combatService.processTap(telegramId, dto.sessionId);
  }

  @Post('complete')
  @ApiOperation({ summary: 'Complete combat session and claim rewards' })
  async complete(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: TapDto,
  ) {
    return this.combatService.completeSession(telegramId, dto.sessionId);
  }

  @Post('flee')
  @ApiOperation({ summary: 'Abandon combat session' })
  async flee(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: TapDto,
  ) {
    return this.combatService.fleeCombat(telegramId, dto.sessionId);
  }
}
