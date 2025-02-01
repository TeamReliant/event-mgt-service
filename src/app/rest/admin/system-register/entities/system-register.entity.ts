import { Column, Entity } from 'typeorm';
import { AbstractEntity } from '@libs/database';

@Entity({ name: 'system_register' })
export class SystemRegister extends AbstractEntity<SystemRegister> {
  @Column({ name: 'accounts_created', default: 0, nullable: true, type: 'int' })
  accountsCreated: number;

  @Column({
    name: 'verified_accounts',
    default: 0,
    nullable: true,
    type: 'int',
  })
  verifiedAccounts: number;

  @Column({ name: 'active_accounts', default: 0, nullable: true, type: 'int' })
  activeAccounts: number;

  @Column({ name: 'blocked_accounts', default: 0, nullable: true, type: 'int' })
  blockedAccounts: number;

  @Column({
    name: 'total_subscribed_attendees',
    default: 0,
    nullable: true,
    type: 'int',
  })
  totalSubscribedOrganizers: number;

  @Column({ name: 'total_events', default: 0, nullable: true, type: 'int' })
  totalEvents: number;

  @Column({ name: 'published_events', default: 0, nullable: true, type: 'int' })
  publishedEvents: number;

  @Column({ name: 'tickets_sold', default: 0, nullable: true, type: 'int' })
  ticketsSold: number;

  @Column({
    name: 'tickets_transferred',
    default: 0,
    nullable: true,
    type: 'int',
  })
  ticketsTransferred: number;

  @Column({ name: 'scanned_tickets', default: 0, nullable: true, type: 'int' })
  scannedTickets: number;

  @Column({ name: 'total_revenue', default: 0, nullable: true, type: 'float' })
  totalRevenue: number;

  @Column({
    name: 'total_withdrawn',
    default: 0,
    nullable: true,
    type: 'float',
  })
  totalWithdrawn: number;

  @Column({
    name: 'total_tickets_processed',
    default: 0,
    nullable: true,
    type: 'int',
  })
  totalTicketsProcessed: number;

  @Column({ name: 'total_attendees', default: 0, nullable: true, type: 'int' })
  totalAttendees: number;

  @Column({ name: 'total_organizers', default: 0, nullable: true, type: 'int' })
  totalOrganizers: number;
}
