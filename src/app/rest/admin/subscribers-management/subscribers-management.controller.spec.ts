import { Test, TestingModule } from '@nestjs/testing';
import { SubscribersManagementController } from './subscribers-management.controller';
import { SubscribersManagementService } from './subscribers-management.service';

describe('SubscribersManagementController', () => {
  let controller: SubscribersManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscribersManagementController],
      providers: [SubscribersManagementService],
    }).compile();

    controller = module.get<SubscribersManagementController>(
      SubscribersManagementController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
