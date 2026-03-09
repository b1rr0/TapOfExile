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
 * ShardTransaction — full log of every shard credit/debit.
 *
 * type='purchase' — shards received from Stars payment
 * type='spend'    — shards spent on shop items
 */
@Entity('shard_transactions')
@Index('idx_shard_tx_player', ['playerTelegramId'])
export class ShardTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  playerTelegramId: string;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerTelegramId' })
  player: Player;

  /** 'purchase' (credit) or 'spend' (debit) */
  @Column({ type: 'varchar', length: 16 })
  type: string;

  /** Shard amount (positive for purchase, negative for spend) */
  @Column({ type: 'int' })
  amount: number;

  /** Balance after this transaction */
  @Column({ type: 'bigint' })
  balanceAfter: string;

  /** Reason: 'stars_purchase', 'buy_trade_slots', 'refund', etc. */
  @Column({ type: 'varchar', length: 64 })
  reason: string;

  /** Optional reference to Payment.id or ShopItem.id */
  @Column({ type: 'varchar', length: 255, nullable: true })
  referenceId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
