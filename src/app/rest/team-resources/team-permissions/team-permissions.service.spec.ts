import { Test, TestingModule } from '@nestjs/testing';
import { TeamPermissionsService } from './team-permissions.service';

describe('TeamPermissionsService', () => {
  let service: TeamPermissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TeamPermissionsService],
    }).compile();

    service = module.get<TeamPermissionsService>(TeamPermissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
