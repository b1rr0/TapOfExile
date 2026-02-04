import { IsNotEmpty, IsString, IsIn, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}
