import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeSkinDto {
  @ApiProperty({ description: 'New skin ID' })
  @IsString()
  @IsNotEmpty()
  skinId: string;
}
