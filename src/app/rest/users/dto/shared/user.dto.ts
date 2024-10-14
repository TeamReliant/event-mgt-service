import { Expose } from 'class-transformer';

export class UserDto {
  @Expose()
  id: number;

  @Expose()
  lastname: string;

  @Expose()
  firstname: string;

  @Expose()
  email: string;

  @Expose()
  picture: string;

  @Expose()
  emailVerifiedAt?: number;

  @Expose()
  fcmDeviceToken?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  numOfEventsCreated: number;

  @Expose()
  numOfPrivateEventsCreated: number;

  @Expose()
  stripeConnectedAccountId?: string;

  @Expose()
  customerId?: string;

  @Expose()
  isOnboarded: boolean;

  @Expose()
  visibility: boolean;

  @Expose()
  subscriptionStatus?:
      'incomplete'
    | 'incomplete_expired'
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'paused'
    | null;

  @Expose()
  subscriptionEndDate?: string;

  @Expose()
  subscribedPlan?: string;
}
