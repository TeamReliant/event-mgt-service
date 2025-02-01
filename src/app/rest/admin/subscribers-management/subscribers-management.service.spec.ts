import { Test, TestingModule } from '@nestjs/testing';
import { SubscribersManagementService } from './subscribers-management.service';

describe('SubscribersManagementService', () => {
  let service: SubscribersManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscribersManagementService],
    }).compile();

    service = module.get<SubscribersManagementService>(
      SubscribersManagementService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
