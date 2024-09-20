import { Test, TestingModule } from '@nestjs/testing';
import { TeamRolePermissionsController } from './team-role-permissions.controller';
import { TeamRolePermissionsService } from './team-role-permissions.service';

describe('TeamRolePermissionsController', () => {
  let controller: TeamRolePermissionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamRolePermissionsController],
      providers: [TeamRolePermissionsService],
    }).compile();

    controller = module.get<TeamRolePermissionsController>(
      TeamRolePermissionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
