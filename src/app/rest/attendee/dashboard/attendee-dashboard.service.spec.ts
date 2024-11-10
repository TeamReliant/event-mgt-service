import { Test, TestingModule } from '@nestjs/testing';
import { AttendeeDashboardService } from './attendee-dashboard.service';

describe('AttendeeDashboardService', () => {
  let service: AttendeeDashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AttendeeDashboardService],
    }).compile();

    service = module.get<AttendeeDashboardService>(AttendeeDashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
