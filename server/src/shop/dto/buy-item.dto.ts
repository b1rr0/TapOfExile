import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BuyItemDto {
  @ApiProperty({ description: 'ShopItem ID (e.g. "trade_slots_10")' })
  @IsString()
  @IsNotEmpty()
  shopItemId: string;
}
