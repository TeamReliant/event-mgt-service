import { PartialType } from '@nestjs/swagger';
import { CreateBookingsTransactionDto } from './create-bookings-transaction.dto';

export class UpdateBookingsTransactionDto extends PartialType(
  CreateBookingsTransactionDto,
) {}
