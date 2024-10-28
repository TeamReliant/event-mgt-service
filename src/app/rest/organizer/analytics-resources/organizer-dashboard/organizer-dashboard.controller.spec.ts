import { Test, TestingModule } from '@nestjs/testing';
import { OrganizerDashboardController } from './organizer-dashboard.controller';
import { OrganizerDashboardService } from './organizer-dashboard.service';

describe('OrganizerDashboardController', () => {
  let controller: OrganizerDashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizerDashboardController],
      providers: [OrganizerDashboardService],
    }).compile();

    controller = module.get<OrganizerDashboardController>(
      OrganizerDashboardController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
