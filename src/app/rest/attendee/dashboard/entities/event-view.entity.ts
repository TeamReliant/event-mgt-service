import { AbstractEntity } from '@libs/database';
import { Entity, ManyToOne } from 'typeorm';
import { User } from '@app/rest/users/entities/user.entity';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';

@Entity({ name: 'event_views' })
export class EventView extends AbstractEntity<EventView> {
  @ManyToOne(() => User, (user) => user.eventViews)
  user: User;

  @ManyToOne(() => Event, (event) => event.eventViews)
  event: Event;
}
