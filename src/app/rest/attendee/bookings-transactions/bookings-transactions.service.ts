import { Injectable } from '@nestjs/common';
import { CreateBookingsTransactionDto } from './dto/create-bookings-transaction.dto';
import { UpdateBookingsTransactionDto } from './dto/update-bookings-transaction.dto';

@Injectable()
export class BookingsTransactionsService {
  create(createBookingsTransactionDto: CreateBookingsTransactionDto) {
    return 'This action adds a new bookingsTransaction';
  }

  findAll() {
    return `This action returns all bookingsTransactions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} bookingsTransaction`;
  }

  update(
    id: number,
    updateBookingsTransactionDto: UpdateBookingsTransactionDto,
  ) {
    return `This action updates a #${id} bookingsTransaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} bookingsTransaction`;
  }
}
