import { TeamInvitation } from '@app/rest/organizer/team-resources/team-invitations/entities/team-invitation.entity';
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { TeamMember } from '@app/rest/organizer/team-resources/team-members/entities/team-member.entity';
import { AbstractEntity } from '@libs/database';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { Team } from '@app/rest/organizer/team-resources/teams/entities/team.entity';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { BookingsTransaction } from '@app/rest/attendee/bookings-transactions/entities/bookings-transaction.entity';
import { UserType } from '@app/rest/users/enums/user-type';
import { EventView } from '@app/rest/attendee/dashboard/entities/event-view.entity';
import { UsersPublicProfile } from './users-public-profile.entity';

@Entity({ name: 'users' })
export class User extends AbstractEntity<User> {
  @Column({ name: 'firstname', type: 'varchar', length: 255, nullable: true })
  firstname?: string;

  @Column({ name: 'lastname', type: 'varchar', length: 255, nullable: true })
  lastname?: string;

  @Column({
    name: 'phone_number',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  phoneNumber?: string;

  @Column({ unique: true, nullable: false, length: 255 })
  email: string;

  @Column({ name: 'picture', type: 'text', nullable: true })
  picture?: string;

  @Column({ name: 'team_name', type: 'varchar', length: 255, nullable: true })
  teamName?: string;

  @Column({ name: 'website', type: 'varchar', length: 1000, nullable: true })
  website?: string;

  @Column({ name: 'bio', type: 'text', nullable: true })
  bio?: string;

  @Column({
    name: 'user_type',
    type: 'varchar',
    length: 255,
    nullable: true,
    default: UserType.ATTENDEE,
  })
  userType?: UserType; // could be an organizer, attendee, or admin

  @Column({
    name: 'visibility',
    type: 'varchar',
    default: true,
  })
  visibility?: string;

  @Column({ name: 'password', type: 'varchar', length: 255, nullable: true })
  password?: string;

  @Column({ name: 'magic_sign_in_token', nullable: true, type: 'bigint' })
  magicSignInToken?: number;

  @Column({ name: 'email_verified_at', type: 'timestamp', nullable: true })
  emailVerifiedAt?: Date;

  @Column({ name: 'email_verification_token', nullable: true, type: 'bigint' })
  emailVerificationToken?: number;

  @Column({
    name: 'password_reset_token',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  passwordResetToken?: number;

  @Column({
    name: 'refresh_token',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  refreshToken?: string;

  @Column({ default: 0 })
  numOfEventsCreated: number;

  @Column({ default: 0 })
  numOfPrivateEventsCreated: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  googleId?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  stripeConnectedAccountId?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  customerId?: string;

  @Column({ default: false })
  isOnboarded: boolean;

  @Column({
    type: 'text',
    nullable: true,
  })
  sessionId?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  updateSessionId?: string;

  @Column({ nullable: true })
  subscriptionStatus?:
    | 'incomplete'
    | 'incomplete_expired'
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'paused'
    | null;

  @Column({ nullable: true, default: 'free' })
  subscribedPlan?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  subscriptionId?: string;

  @Column({ nullable: true })
  subscriptionEndDate?: string;

  @Column({
    name: 'total_revenue',
    nullable: true,
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  totalRevenue: number;

  @Column({ name: 'tickets_sold', type: 'bigint', nullable: true })
  ticketsSold: number;

  @OneToMany(() => Event, (events) => events.user, { cascade: true })
  events?: Event[];

  // teams where the user is an admin
  @OneToMany(() => TeamMember, (members) => members.user, { cascade: true })
  teamMembers?: TeamMember[];

  @OneToMany(() => Team, (teams) => teams.admin, { cascade: true })
  teams?: Team[];

  @OneToMany(() => TeamInvitation, (invitation) => invitation.user, {
    cascade: true,
  })
  invitations?: TeamInvitation[];

  @OneToMany(() => Booking, (booking) => booking.user, { cascade: true })
  bookings?: Booking[];

  @OneToMany(() => EventView, (view) => view.user, {
    cascade: true,
  })
  eventViews?: EventView[];

  // @OneToMany(() => Booking, (booking) => booking.transferredTo, {
  //   cascade: true,
  // })
  // bookingsTransferredTo?: Booking[];
  //
  // @OneToMany(() => Booking, (booking) => booking.transferredFrom, {
  //   cascade: true,
  // })
  // bookingsTransferredFrom?: Booking[];

  @OneToMany(() => BookingsTransaction, (trans) => trans.user, {
    cascade: true,
  })
  bookingsTransactions?: BookingsTransaction[];

  @OneToOne(() => UsersPublicProfile, (publicProfile) => publicProfile.user, {
    cascade: true,
  })
  @JoinColumn({ name: 'publicProfileId' })
  publicProfile: UsersPublicProfile;
}
