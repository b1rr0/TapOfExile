import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { MigrationService } from './migration.service';
import { ImportLocalDto } from './dto/import-local.dto';

@ApiTags('migration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('migration')
export class MigrationController {
  constructor(private migrationService: MigrationService) {}

  @Post('import-local')
  @ApiOperation({ summary: 'Import localStorage save to server' })
  async importLocal(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: ImportLocalDto,
  ) {
    return this.migrationService.importLocalSave(
      telegramId,
      dto.gameData,
    );
  }
}
