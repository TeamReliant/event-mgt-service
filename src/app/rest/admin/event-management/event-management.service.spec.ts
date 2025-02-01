import { Test, TestingModule } from '@nestjs/testing';
import { EventManagementService } from './event-management.service';

describe('EventManagementService', () => {
  let service: EventManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventManagementService],
    }).compile();

    service = module.get<EventManagementService>(EventManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
