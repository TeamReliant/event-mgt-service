import { UserType } from '@app/rest/users/enums/user-type';
import { Expose, Type } from 'class-transformer';
import { PublicProfileDto } from '@app/rest/users/dto/shared/public-profile.dto';

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
  userType: UserType;

  @Expose()
  createdAt: Date;

  @Expose()
  numOfEventsCreated: number;

  @Expose()
  numOfPrivateEventsCreated: number;

  @Expose()
  stripeConnectedAccountId?: string;

  @Expose()
  isOnboarded: boolean;

  @Expose()
  subscribedPlan?: string;

  @Expose()
  phoneNumber?: string;

  @Expose()
  visibility: boolean;

  @Expose()
  website: string;

  @Expose()
  blocked: boolean;

  @Expose()
  lastLoggedIn: Date;

  @Expose()
  @Type(() => PublicProfileDto)
  publicProfile: PublicProfileDto;
}
