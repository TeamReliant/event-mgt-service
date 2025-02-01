import { Test, TestingModule } from '@nestjs/testing';
import { BookingsTransactionsController } from './bookings-transactions.controller';
import { BookingsTransactionsService } from './bookings-transactions.service';

describe('BookingsTransactionsController', () => {
  let controller: BookingsTransactionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsTransactionsController],
      providers: [BookingsTransactionsService],
    }).compile();

    controller = module.get<BookingsTransactionsController>(
      BookingsTransactionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
