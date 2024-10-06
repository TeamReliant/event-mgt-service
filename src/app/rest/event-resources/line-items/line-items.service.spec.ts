import { Test, TestingModule } from '@nestjs/testing';
import { LineItemsService } from './line-items.service';

describe('LineItemsService', () => {
  let service: LineItemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LineItemsService],
    }).compile();

    service = module.get<LineItemsService>(LineItemsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
