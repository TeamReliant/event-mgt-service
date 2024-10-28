import { Test, TestingModule } from '@nestjs/testing';
import { OrganizerDashboardService } from './organizer-dashboard.service';

describe('OrganizerDashboardService', () => {
  let service: OrganizerDashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizerDashboardService],
    }).compile();

    service = module.get<OrganizerDashboardService>(OrganizerDashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
