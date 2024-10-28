import { Test, TestingModule } from '@nestjs/testing';
import { GeneralEventAnalyticsService } from './general-event-analytics.service';

describe('GeneralEventAnalyticsService', () => {
  let service: GeneralEventAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeneralEventAnalyticsService],
    }).compile();

    service = module.get<GeneralEventAnalyticsService>(
      GeneralEventAnalyticsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
