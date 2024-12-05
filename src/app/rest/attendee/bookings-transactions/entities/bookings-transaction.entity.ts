import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { User } from '@app/rest/users/entities/user.entity';
import { AbstractEntity } from '@libs/database';

@Entity({ name: 'bookings_transactions' })
export class BookingsTransaction extends AbstractEntity<BookingsTransaction> {
  @Column({ name: 'stripe_checkout_id', nullable: false, type: 'text' })
  stripeCheckoutId: string;

  @Column({ name: 'stripe_checkout_url', nullable: false, type: 'text' })
  stripeCheckoutUrl: string;

  @Column({ name: 'total_amount', nullable: false, type: 'float' })
  totalAmount: number;

  @Column({ name: 'currency', nullable: true, type: 'varchar' })
  currency: string;

  @Column({
    name: 'processed',
    nullable: false,
    type: 'boolean',
    default: false,
  })
  processed: boolean;

  @Column({
    name: 'paid',
    nullable: false,
    type: 'boolean',
    default: false,
  })
  paid: boolean;

  @ManyToOne(() => User, (user) => user.bookingsTransactions)
  user: User;

  @OneToMany(() => Booking, (booking) => booking.transaction, { cascade: true })
  bookings: Booking[];
}
