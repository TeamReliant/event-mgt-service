import { UserType } from '@app/rest/users/enums/user-type';
import { Expose } from 'class-transformer';

export class AllUserDto {
  @Expose()
  id: number;

  @Expose()
  firstname: string;

  @Expose()
  lastname: string;

  @Expose()
  email: string;

  @Expose()
  emailVerifiedAt?: number;

  @Expose()
  userType: UserType;

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
  subscribedPlan?: string;

  @Expose()
  phoneNumber?: string;

  @Expose()
  visibility: boolean;

  @Expose()
  subscriptionEndDate?: string;

  @Expose()
  website: boolean;

  @Expose()
  bio: string;

  @Expose()
  totalRevenue: number;

  @Expose()
  blocked: boolean;

  @Expose()
  totalPlatformFee: number;

  @Expose()
  totalStripeFee: number;
}
