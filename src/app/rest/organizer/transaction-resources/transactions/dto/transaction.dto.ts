import { Expose } from 'class-transformer';

export class TransactionDto {
  @Expose()
  id: number;

  @Expose()
  userId: string;

  @Expose()
  plan: string;

  @Expose()
  amount: number;

  @Expose()
  currency: string;

  @Expose()
  transactionId: string;

  @Expose()
  paymentMethod: string;

  @Expose()
  status: string;

  @Expose()
  subscriptionId: string;

  @Expose()
  createdAt: Date;

  @Expose()
  failureReason?: string;
}
