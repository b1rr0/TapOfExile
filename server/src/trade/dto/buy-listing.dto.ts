import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BuyListingDto {
  @ApiProperty({ description: 'Trade listing UUID to purchase' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  listingId: string;
}
