import { Test, TestingModule } from '@nestjs/testing';
import { TeamRolePermissionsService } from './team-role-permissions.service';

describe('TeamRolePermissionsService', () => {
  let service: TeamRolePermissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TeamRolePermissionsService],
    }).compile();

    service = module.get<TeamRolePermissionsService>(
      TeamRolePermissionsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
