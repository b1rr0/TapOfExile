import { IsNotEmpty, IsString, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartLocationDto {
  @ApiProperty({ description: 'Location ID to start combat in' })
  @IsString()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({ description: 'Location waves definition' })
  @IsArray()
  waves: any[];

  @ApiProperty({ description: 'Location order (difficulty tier)' })
  @IsNumber()
  order: number;

  @ApiProperty({ description: 'Act number' })
  @IsNumber()
  act: number;
}
