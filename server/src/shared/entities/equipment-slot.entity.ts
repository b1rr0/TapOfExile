import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Character } from './character.entity';
import { Item } from './item.entity';

@Entity('equipment_slots')
@Unique(['characterId', 'slotId'])
export class EquipmentSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  characterId: string;

  @ManyToOne(() => Character, (c) => c.equipmentSlots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'characterId' })
  character: Character;

  @Column({ type: 'varchar', length: 32 })
  slotId: string; // 'consumable-1' | 'consumable-2' | 'weapon-left' | 'head' | ...

  @Column({ type: 'varchar', length: 128 })
  itemId: string;

  @OneToOne(() => Item, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'itemId' })
  item: Item;
}
