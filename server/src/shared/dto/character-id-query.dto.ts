import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CharacterIdQueryDto {
  @ApiProperty({ description: 'Character ID' })
  @IsString()
  @IsNotEmpty()
  characterId: string;
}
