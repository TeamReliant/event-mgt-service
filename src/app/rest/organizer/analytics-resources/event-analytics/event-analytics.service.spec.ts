import { Test, TestingModule } from '@nestjs/testing';
import { EventAnalyticsService } from './event-analytics.service';

describe('EventAnalyticsService', () => {
  let service: EventAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventAnalyticsService],
    }).compile();

    service = module.get<EventAnalyticsService>(EventAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
