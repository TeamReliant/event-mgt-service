import { Expose } from 'class-transformer';

export class PublicProfileDto {
  @Expose()
  id: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  companyName: string;

  @Expose()
  bio: string;

  @Expose()
  email: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  country: string;

  @Expose()
  state: string;

  @Expose()
  city: string;

  @Expose()
  zip: string;

  @Expose()
  address: string;

  @Expose()
  website: string;

  @Expose()
  visibility: boolean;

  @Expose()
  logo: string;
}
