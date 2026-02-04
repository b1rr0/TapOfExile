import { IsNotEmpty, IsString, IsIn, MaxLength, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCharacterDto {
  @ApiProperty({ description: 'Character nickname' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  nickname: string;

  @ApiProperty({
    description: 'Class ID',
    enum: ['samurai', 'warrior', 'mage', 'archer'],
  })
  @IsString()
  @IsIn(['samurai', 'warrior', 'mage', 'archer'])
  classId: string;

  @ApiPropertyOptional({ description: 'League ID to create character in (defaults to active league)' })
  @IsOptional()
  @IsString()
  @IsUUID()
  leagueId?: string;
}
