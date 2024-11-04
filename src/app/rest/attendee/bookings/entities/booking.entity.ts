import { Column, Entity, ManyToOne } from 'typeorm';
import { AbstractEntity } from '@libs/database';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { TicketCategory } from '@app/rest/organizer/ticket-resources/tickets/enums';
import { FreeTicketReaction } from '@app/rest/attendee/bookings/enums/free-ticket-reaction';
import { User } from '@app/rest/users/entities/user.entity';
import { Ticket } from '@app/rest/organizer/ticket-resources/tickets/entities/ticket.entity';
import { BookingsTransaction } from '@app/rest/attendee/bookings-transactions/entities/bookings-transaction.entity';

@Entity({ name: 'bookings' })
export class Booking extends AbstractEntity<Booking> {
  @Column({ name: 'quantity', nullable: false, type: 'int' })
  quantity: number;

  @Column({
    name: 'category',
    type: 'enum',
    enum: TicketCategory,
    default: TicketCategory.PAID,
  })
  category: TicketCategory;

  @Column({
    name: 'reaction',
    type: 'enum',
    enum: FreeTicketReaction,
    nullable: true,
  })
  reaction?: FreeTicketReaction; // required if ticketType is free

  @Column({
    name: 'unit_amount',
    nullable: true,
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  unitAmount?: number;

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

  @Column({ name: 'email', nullable: false, type: 'varchar' })
  email: string;

  @Column({ name: 'first_name', nullable: false, type: 'varchar' })
  firstName: string;

  @Column({ name: 'last_name', nullable: false, type: 'varchar' })
  lastName: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.bookings)
  ticket: Ticket;

  @ManyToOne(() => Event, (event) => event.bookings)
  event: Event;

  @ManyToOne(() => BookingsTransaction, (transaction) => transaction.bookings)
  transaction: BookingsTransaction;

  @ManyToOne(() => User, (user) => user.bookings)
  user: User;
}
