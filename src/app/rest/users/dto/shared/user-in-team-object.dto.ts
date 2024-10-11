import { Expose } from 'class-transformer';

export class UserInTeamDto {
  @Expose()
  id: number;

  @Expose()
  lastname: string;

  @Expose()
  firstname: string;

  @Expose()
  email: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

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
    | 'incomplete'
    | 'incomplete_expired'
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'paused'
    | null;

  @Expose()
  subscribedPlan?: string;
}
