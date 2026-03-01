import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateListingDto {
  @ApiProperty({ description: 'Item ID from bag to list for sale' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: 'Asking price in gold (positive integer)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9]\d*$/, { message: 'Price must be a positive integer string' })
  price: string;
}
