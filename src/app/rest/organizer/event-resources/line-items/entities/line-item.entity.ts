import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity } from '@libs/database';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';

@Entity({ name: 'line_items' })
export class LineItem extends AbstractEntity<LineItem> {
  @Column({ name: 'name', type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ name: 'category', type: 'text', nullable: true })
  category?: string;

  @Column({
    name: 'intended_budget',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  intendedBudget?: number;

  @Column({
    name: 'amount_spent',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  amountSpent?: number;

  @ManyToOne(() => Event, (event) => event.lineItems)
  @JoinColumn({ name: 'eventId' })
  event: Event;
}
