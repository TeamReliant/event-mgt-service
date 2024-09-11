import { Test, TestingModule } from '@nestjs/testing';
import { TeamRolesController } from './team-roles.controller';
import { TeamRolesService } from './team-roles.service';

describe('TeamRolesController', () => {
  let controller: TeamRolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamRolesController],
      providers: [TeamRolesService],
    }).compile();

    controller = module.get<TeamRolesController>(TeamRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
