import { Module } from '@nestjs/common';
import { BookingsTransactionsService } from './bookings-transactions.service';
import { BookingsTransactionsController } from './bookings-transactions.controller';

@Module({
  controllers: [BookingsTransactionsController],
  providers: [BookingsTransactionsService],
})
export class BookingsTransactionsModule {}
