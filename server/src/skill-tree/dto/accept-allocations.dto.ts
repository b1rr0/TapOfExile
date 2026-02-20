import { IsNotEmpty, IsString, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptAllocationsDto {
  @ApiProperty({ description: 'Character ID' })
  @IsString()
  @IsNotEmpty()
  characterId: string;

  @ApiProperty({ description: 'Array of allocated node indices', type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  allocated: number[];
}

export class ResetAllocationsDto {
  @ApiProperty({ description: 'Character ID' })
  @IsString()
  @IsNotEmpty()
  characterId: string;
}
