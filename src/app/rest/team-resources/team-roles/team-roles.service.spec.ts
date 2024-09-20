import { Test, TestingModule } from '@nestjs/testing';
import { TeamRolesService } from './team-roles.service';

describe('TeamRolesService', () => {
  let service: TeamRolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TeamRolesService],
    }).compile();

    service = module.get<TeamRolesService>(TeamRolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
