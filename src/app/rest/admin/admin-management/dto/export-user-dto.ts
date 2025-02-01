import { Expose } from 'class-transformer';

export class UserExportDto {
  @Expose({ name: 'Name' })
  fullName: string;

  @Expose({ name: 'Email Address' })
  email: string;

  @Expose({ name: 'Date Added' })
  createdAt: Date;

  @Expose({ name: 'User Type' })
  userType: string;

  @Expose({ name: 'Last Active' })
  lastLoggedIn: Date;

  @Expose()
  status: string;

  @Expose({ name: 'Company Name' })
  companyName: string;

  @Expose({ name: 'Plan' })
  subscribedPlan: string;

  @Expose({ name: 'Phone Number' })
  phoneNumber: string;

  @Expose()
  country: string;

  @Expose()
  city: string;

  @Expose()
  state: string;

  @Expose()
  address: string;

  @Expose()
  zip: string;

  @Expose()
  website: string;
}
