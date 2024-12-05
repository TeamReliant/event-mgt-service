import { Test, TestingModule } from '@nestjs/testing';
import { AttendeeDashboardController } from './attendee-dashboard.controller';
import { AttendeeDashboardService } from './attendee-dashboard.service';

describe('AttendeeDashboardController', () => {
  let controller: AttendeeDashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendeeDashboardController],
      providers: [AttendeeDashboardService],
    }).compile();

    controller = module.get<AttendeeDashboardController>(
      AttendeeDashboardController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
