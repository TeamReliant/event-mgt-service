import { Test, TestingModule } from '@nestjs/testing';
import { EventAnalyticsController } from './event-analytics.controller';
import { EventAnalyticsService } from './event-analytics.service';

describe('EventAnalyticsController', () => {
  let controller: EventAnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventAnalyticsController],
      providers: [EventAnalyticsService],
    }).compile();

    controller = module.get<EventAnalyticsController>(EventAnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
