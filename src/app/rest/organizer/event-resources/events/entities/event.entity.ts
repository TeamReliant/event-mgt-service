import {
  Column,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { EventStatus, EventVisibility } from '../enums';
import { Ticket } from '@app/rest/organizer/ticket-resources/tickets/entities/ticket.entity';
import { User } from '@app/rest/users/entities/user.entity';
import { AbstractEntity } from '@libs/database';
import { Task } from '@app/rest/organizer/event-resources/tasks/entities/task.entity';
import { Team } from '@app/rest/organizer/team-resources/teams/entities/team.entity';
import { LineItem } from '@app/rest/organizer/event-resources/line-items/entities/line-item.entity';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { EventView } from '@app/rest/attendee/dashboard/entities/event-view.entity';

@Entity({ name: 'events' })
export class Event extends AbstractEntity<Event> {
  @Column()
  name: string;

  @Column({ name: 'slug', unique: true, nullable: true })
  slug: string;

  @Column({ name: 'location', type: 'varchar', length: 255, nullable: true })
  location?: string;

  @Column({ name: 'locationPlaceId', nullable: true })
  locationPlaceId?: string;

  @Column({ nullable: true })
  locationName?: string;

  @Column({ nullable: true })
  googleMapUrl?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  longitude?: string;

  @Column({ nullable: true })
  latitude?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  additionalInfo?: string;

  @Column({ nullable: true })
  eventImageURL?: string;

  @Column('simple-array')
  tags?: string[] = [];

  @Column({
    type: 'enum',
    enum: EventVisibility,
    default: EventVisibility.PRIVATE,
  })
  eventVisibility?: EventVisibility;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.DRAFT,
  })
  eventStatus?: EventStatus;

  @Column('timestamp', { nullable: true })
  eventStartDateAndTime?: Date;

  @Column('timestamp', { nullable: true })
  eventEndDateAndTime?: Date;

  @Column({ nullable: true })
  timeZone?: string;

  // should be set to false when all ticket in tickets.isAvailable returns false
  //  should be set to false when eventEndDate is less than current date
  @Column({ default: true })
  isAvailable?: boolean;

  //sum of all tickets sold for all ticket types
  @Column({ nullable: true, default: 0 })
  totalNumberOfTicketsSold?: number;

  @Column({
    name: 'revenue',
    nullable: true,
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  revenue?: number;

  @Column({
    name: 'total_platform_fee',
    nullable: true,
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  totalPlatformFee: number;

  @Column({
    name: 'total_stripe_fee',
    nullable: true,
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  totalStripeFee: number;

  @DeleteDateColumn()
  deletedAt: Date;

  //cascade true automatically saves tickets when an event is saved
  @OneToMany(() => Ticket, (ticket) => ticket.event, { cascade: true })
  tickets: Ticket[];

  @ManyToOne(() => User, (user) => user.events)
  user: User;

  @OneToMany(() => Task, (task) => task.event, { cascade: true })
  tasks: Task[];

  @OneToMany(() => LineItem, (item) => item.event, { cascade: true })
  lineItems: LineItem[];

  @ManyToOne(() => Team, (team) => team.events)
  team: Team;

  @OneToMany(() => Booking, (booking) => booking.event, { cascade: true })
  bookings: Booking[];

  @OneToMany(() => EventView, (view) => view.event, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  eventViews?: EventView[];

  constructor(event: Partial<Event>) {
    super(event);
  }
}
