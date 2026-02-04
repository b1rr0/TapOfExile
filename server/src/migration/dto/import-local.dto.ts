import { IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportLocalDto {
  @ApiProperty({ description: 'Full GameData JSON from localStorage' })
  @IsObject()
  @IsNotEmpty()
  gameData: Record<string, unknown>;
}
