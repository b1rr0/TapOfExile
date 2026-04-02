import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelListingDto {
  @ApiProperty({ description: 'Trade listing UUID to cancel' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  listingId: string;
}
