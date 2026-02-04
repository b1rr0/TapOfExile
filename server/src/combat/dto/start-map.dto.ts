import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartMapDto {
  @ApiProperty({ description: 'Map key item ID from bag' })
  @IsString()
  @IsNotEmpty()
  mapKeyItemId: string;

  @ApiPropertyOptional({ description: 'Boss direction (bossId for boss keys)' })
  @IsString()
  @IsOptional()
  direction?: string;
}
