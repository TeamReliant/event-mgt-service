import { Test, TestingModule } from '@nestjs/testing';
import { BookingsTransactionsService } from './bookings-transactions.service';

describe('BookingsTransactionsService', () => {
  let service: BookingsTransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookingsTransactionsService],
    }).compile();

    service = module.get<BookingsTransactionsService>(
      BookingsTransactionsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
