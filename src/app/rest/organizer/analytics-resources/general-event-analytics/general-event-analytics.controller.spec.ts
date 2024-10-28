import { Test, TestingModule } from '@nestjs/testing';
import { GeneralEventAnalyticsController } from './general-event-analytics.controller';
import { GeneralEventAnalyticsService } from './general-event-analytics.service';

describe('GeneralEventAnalyticsController', () => {
  let controller: GeneralEventAnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeneralEventAnalyticsController],
      providers: [GeneralEventAnalyticsService],
    }).compile();

    controller = module.get<GeneralEventAnalyticsController>(
      GeneralEventAnalyticsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
