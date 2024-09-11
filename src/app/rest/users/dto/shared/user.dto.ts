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
}
