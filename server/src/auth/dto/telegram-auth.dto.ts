import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TelegramAuthDto {
  @ApiProperty({ description: 'Telegram WebApp initData string' })
  @IsString()
  @IsNotEmpty()
  initData: string;

  @ApiPropertyOptional({ description: 'Telegram deep link start_param (e.g. ref_<telegramId>)' })
  @IsOptional()
  @IsString()
  startParam?: string;
}
