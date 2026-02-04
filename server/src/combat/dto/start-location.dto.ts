import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartLocationDto {
  @ApiProperty({ description: 'Location ID to start combat in' })
  @IsString()
  @IsNotEmpty()
  locationId: string;
}
