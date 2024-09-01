import { AbstractEntity } from '@libs/database/abstract.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { EventStatus, EventVisibility } from '../enums';
import { Ticket } from '@app/rest/ticket-resources/tickets/entities/ticket.entity';
import { User } from '@app/rest/users/entities/user.entity';

@Entity()
export class Event extends AbstractEntity<Event> {
  @Column()
  name: string;

  @Column()
  location: string;

  @Column()
  address: string;

  @Column({nullable:  true})
  description: string;

  @Column({nullable: true})
  eventImageURL: string;

  @Column("simple-array")
  tags: string[] = [];

  @Column({
    type: "enum",
    enum: EventVisibility,
    default: EventVisibility.PRIVATE
  })
  eventVisibility: EventVisibility;

  @Column({
    type: "enum",
    enum: EventStatus,
    default: EventStatus.DRAFT
  })
  eventStatus: EventStatus;

  @Column()
  eventStartDate: Date;

  @Column({nullable: true})
  eventEndDate:Date;

  @Column('time')
  eventStartTime: string;


  @Column('time', {nullable: true})
  eventEndTime: string;

  // should be set to false when all ticket in tickets.isAvailable returns false
  //  should be set to false when eventEndDate is less than current date
  @Column({default: true})
  isAvailable: boolean;

  //cascade true automatically saves tickets when an event is saved
  @OneToMany(() => Ticket, ticket => ticket.event, {cascade: true})
  tickets: Ticket[];

  @ManyToOne(() => User, user => user.events)
  user: User;

  constructor(event: Partial<Event>) {
    super(event);
  }
}
