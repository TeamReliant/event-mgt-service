import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BookingsTransactionsService } from './bookings-transactions.service';
import { CreateBookingsTransactionDto } from './dto/create-bookings-transaction.dto';
import { UpdateBookingsTransactionDto } from './dto/update-bookings-transaction.dto';

@Controller('bookings-transactions')
export class BookingsTransactionsController {
  constructor(
    private readonly bookingsTransactionsService: BookingsTransactionsService,
  ) {}

  @Post()
  create(@Body() createBookingsTransactionDto: CreateBookingsTransactionDto) {
    return this.bookingsTransactionsService.create(
      createBookingsTransactionDto,
    );
  }

  @Get()
  findAll() {
    return this.bookingsTransactionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingsTransactionsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBookingsTransactionDto: UpdateBookingsTransactionDto,
  ) {
    return this.bookingsTransactionsService.update(
      +id,
      updateBookingsTransactionDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingsTransactionsService.remove(+id);
  }
}
