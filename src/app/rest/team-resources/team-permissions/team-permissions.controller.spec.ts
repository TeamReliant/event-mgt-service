import { Test, TestingModule } from '@nestjs/testing';
import { TeamPermissionsController } from './team-permissions.controller';
import { TeamPermissionsService } from './team-permissions.service';

describe('TeamPermissionsController', () => {
  let controller: TeamPermissionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamPermissionsController],
      providers: [TeamPermissionsService],
    }).compile();

    controller = module.get<TeamPermissionsController>(
      TeamPermissionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
