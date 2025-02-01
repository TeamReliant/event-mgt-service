import { Test, TestingModule } from '@nestjs/testing';
import { LineItemsController } from './line-items.controller';
import { LineItemsService } from './line-items.service';

describe('LineItemsController', () => {
  let controller: LineItemsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LineItemsController],
      providers: [LineItemsService],
    }).compile();

    controller = module.get<LineItemsController>(LineItemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
