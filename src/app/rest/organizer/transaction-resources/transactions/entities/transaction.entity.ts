import { AbstractEntity } from '@libs/database';
import { Column, Entity } from 'typeorm';

@Entity()
export class Transaction extends AbstractEntity<Transaction> {
  @Column()
  userId: string;

  @Column()
  plan: string;

  @Column({ nullable: true })
  type?: string;

  @Column('decimal')
  amount: number;

  @Column()
  currency: string;

  @Column()
  transactionId: string;

  @Column({ default: 'card' })
  paymentMethod: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  subscriptionId?: string;

  @Column({ nullable: true })
  failureReason?: string;
}
