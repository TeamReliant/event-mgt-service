import { AbstractEntity } from '@libs/database';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '@app/rest/users/entities/user.entity';

@Entity()
export class Transaction extends AbstractEntity<Transaction> {
  @ManyToOne(() => User, (user) => user.history)
  @JoinColumn({ name: 'userId' })
  user: User;

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
