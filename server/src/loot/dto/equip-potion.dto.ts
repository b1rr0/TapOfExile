import { IsNotEmpty, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EquipPotionDto {
  @ApiProperty({ description: 'Item ID of the potion to equip' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: 'Consumable slot', enum: ['consumable-1', 'consumable-2'] })
  @IsString()
  @IsIn(['consumable-1', 'consumable-2'])
  slot: 'consumable-1' | 'consumable-2';
}

export class UnequipPotionDto {
  @ApiProperty({ description: 'Consumable slot', enum: ['consumable-1', 'consumable-2'] })
  @IsString()
  @IsIn(['consumable-1', 'consumable-2'])
  slot: 'consumable-1' | 'consumable-2';
}
