import {
  Column,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { TicketCategory } from '../enums';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { AbstractEntity } from '@libs/database';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { Delete } from '@nestjs/common';

@Entity()
export class Ticket extends AbstractEntity<Ticket> {
  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price?: number;

  @Column({
    type: 'enum',
    enum: TicketCategory,
    default: TicketCategory.PAID,
  })
  category?: TicketCategory;

  @Column({ nullable: true })
  availableTickets?: number;

  @Column({ default: 1 })
  minNumberOfTicketsOrderable?: number;

  @Column({ nullable: true })
  maxNumberOfTicketsOrderable?: number;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: 0 })
  numberOfTicketsSold: number;

  // should be set to false when number of tickets sold is equal to availableTickets
  @Column({ default: true })
  isAvailable: boolean;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => Event, (event) => event.tickets)
  event: Event;

  @OneToMany(() => Booking, (booking) => booking.ticket, { cascade: true })
  bookings: Booking[];

  constructor(ticket: Partial<Ticket>) {
    super(ticket);
  }
}
