import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Player } from './player.entity';

/**
 * Payment - log of every Telegram Stars → Shards purchase.
 */
@Entity('payments')
@Index('idx_payment_player', ['playerTelegramId'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  playerTelegramId: string;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerTelegramId' })
  player: Player;

  /** Which Stars package was purchased (e.g. 'shards_100') */
  @Column({ type: 'varchar', length: 64 })
  productId: string;

  /** How many Shards were credited */
  @Column({ type: 'int' })
  shardsAmount: number;

  /** How many Telegram Stars were charged */
  @Column({ type: 'int' })
  starsAmount: number;

  /** Telegram's unique charge ID - idempotency key */
  @Column({ type: 'varchar', length: 255, unique: true })
  telegramPaymentChargeId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerPaymentChargeId: string | null;

  /** Original invoice payload JSON for audit */
  @Column({ type: 'varchar', length: 512 })
  invoicePayload: string;

  @Column({ type: 'varchar', length: 32, default: 'completed' })
  status: string; // 'completed' | 'refunded'

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  refundedAt: Date | null;
}
