import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('daily_rewards')
export class DailyReward {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  playerTelegramId: string;

  @Column({ type: 'uuid', nullable: true })
  leagueId: string | null;

  @Column({ type: 'int' })
  day: number;

  @Column({ type: 'varchar', length: 32 })
  rewardType: string;

  @Column({ type: 'jsonb' })
  rewardData: Record<string, unknown>;

  @CreateDateColumn()
  claimedAt: Date;
}
