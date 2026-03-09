import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Product ID from SHOP_PRODUCTS catalog' })
  @IsString()
  @IsNotEmpty()
  productId: string;
}
