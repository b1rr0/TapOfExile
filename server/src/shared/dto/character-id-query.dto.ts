import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CharacterIdQueryDto {
  @ApiProperty({ description: 'Character UUID' })
  @IsUUID()
  @IsNotEmpty()
  characterId: string;
}
