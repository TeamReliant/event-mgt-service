import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { EventStatus, EventVisibility } from '../enums';
import { Ticket } from '@app/rest/ticket-resources/tickets/entities/ticket.entity';
import { User } from '@app/rest/users/entities/user.entity';
import { AbstractEntity } from '@libs/database';
import { Task } from '@app/rest/event-resources/tasks/entities/task.entity';
import { Team } from '@app/rest/team-resources/teams/entities/team.entity';
import { LineItem } from '@app/rest/event-resources/line-items/entities/line-item.entity';

@Entity({ name: 'events' })
export class Event extends AbstractEntity<Event> {
  @Column()
  name: string;

  @Column({ name: 'location', type: 'varchar', length: 255, nullable: true })
  location?: string;

  @Column()
  locationPlaceId: string;

  @Column()
  locationName: string;

  @Column({ nullable: true })
  googleMapUrl: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  additionalInfo: string;

  @Column({ nullable: true })
  eventImageURL: string;

  @Column('simple-array')
  tags: string[] = [];

  @Column({
    type: 'enum',
    enum: EventVisibility,
    default: EventVisibility.PRIVATE,
  })
  eventVisibility: EventVisibility;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.DRAFT,
  })
  eventStatus: EventStatus;

  @Column('timestamp', { nullable: true })
  eventStartDateAndTime: Date;

  @Column('timestamp', { nullable: true })
  eventEndDateAndTime: Date;

  @Column({ nullable: true })
  timeZone: string;

  // should be set to false when all ticket in tickets.isAvailable returns false
  //  should be set to false when eventEndDate is less than current date
  @Column({ default: true })
  isAvailable: boolean;

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

  constructor(event: Partial<Event>) {
    super(event);
  }
}
