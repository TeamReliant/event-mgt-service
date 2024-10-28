import { AbstractEntity } from '@libs/database';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { TeamMember } from '@app/rest/organizer/team-resources/team-members/entities/team-member.entity';

@Entity({ name: 'tasks' })
export class Task extends AbstractEntity<Task> {
  @Column({
    name: 'taskId',
    type: 'varchar',
    nullable: false,
  })
  taskId: string;

  @Column({
    name: 'title',
    type: 'varchar',
    nullable: false,
  })
  title: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    name: 'due_date',
    type: 'timestamp',
    nullable: true,
  })
  dueDate?: Date;

  @Column({
    name: 'priority',
    type: 'varchar',
    nullable: true,
  })
  priority?: string;

  @Column({
    name: 'status',
    type: 'varchar',
    nullable: true,
    default: 'pending',
  })
  status?: string;

  // many-to-one relation with event
  @ManyToOne(() => Event, (event) => event.tasks)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  // one-to-one relation with team member
  @ManyToOne(() => TeamMember, (member) => member.tasks)
  assignee?: TeamMember;
}
