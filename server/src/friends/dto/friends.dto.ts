import { IsNotEmpty, IsString, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendRequestDto {
  @ApiProperty({ description: 'Your character ID' })
  @IsString()
  @IsNotEmpty()
  fromCharacterId: string;

  @ApiProperty({ description: 'Target character ID' })
  @IsString()
  @IsNotEmpty()
  toCharacterId: string;
}

export class RespondRequestDto {
  @ApiProperty({ description: 'Friendship ID' })
  @IsUUID()
  @IsNotEmpty()
  friendshipId: string;

  @ApiProperty({ description: 'Accept or reject' })
  @IsBoolean()
  accept: boolean;
}
