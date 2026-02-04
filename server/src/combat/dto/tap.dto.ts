import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TapDto {
  @ApiProperty({ description: 'Active combat session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
