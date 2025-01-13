import { Expose } from 'class-transformer';

export class SubscriberExportDto {
  @Expose({ name: 'Email Address' })
  email: string;

  @Expose({ name: 'Date Added' })
  createdAt: Date;
}
