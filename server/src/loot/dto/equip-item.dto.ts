import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EquipItemDto {
  @ApiProperty({ description: 'Item ID of the equipment to equip' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({
    description: 'UI slot to equip into',
    example: 'weapon-left',
  })
  @IsString()
  @IsNotEmpty()
  slotId: string;
}

export class UnequipItemDto {
  @ApiProperty({
    description: 'UI slot to unequip from',
    example: 'head',
  })
  @IsString()
  @IsNotEmpty()
  slotId: string;
}
