import { Expose, Type } from 'class-transformer';
import { TeamDto } from '@app/rest/organizer/team-resources/teams/dto/team.dto';
import { PublicProfileDto } from './public-profile.dto';

export class UserProfileDto {
  @Expose()
  id: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  firstname: string;

  @Expose()
  lastname: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  email: string;

  @Expose()
  picture: string;

  @Expose()
  teamName: string;

  @Expose()
  website: string;

  @Expose()
  bio: string;

  @Expose()
  userType: string;

  @Expose()
  visibility: boolean;

  @Expose()
  magicSignInToken: string;

  @Expose()
  emailVerifiedAt?: number;

  @Expose()
  numOfEventsCreated: number;

  @Expose()
  numOfPrivateEventsCreated: number;

  @Expose()
  googleId: string;

  @Expose()
  stripeConnectedAccountId?: string;

  @Expose()
  customerId?: string;

  @Expose()
  isOnboarded: boolean;

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

  @Expose()
  subscriptionEndDate?: string;

  @Expose()
  totalRevenue?: number;

  @Expose()
  ticketsSold: number;

  @Expose()
  lastLoggedIn: Date;

  @Expose()
  blocked: boolean;

  @Expose()
  @Type(() => PublicProfileDto)
  publicProfile: PublicProfileDto;

  @Expose()
  @Type(() => TeamDto)
  teams: TeamDto[];
}
