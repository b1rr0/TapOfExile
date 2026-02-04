import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { Character } from './character.entity';

@Entity('skill_allocations')
@Unique(['characterId', 'nodeId'])
export class SkillAllocation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  characterId: string;

  @ManyToOne(() => Character, (char) => char.skillAllocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'characterId' })
  character: Character;

  @Column({ type: 'int' })
  nodeId: number;

  @CreateDateColumn()
  allocatedAt: Date;
}
