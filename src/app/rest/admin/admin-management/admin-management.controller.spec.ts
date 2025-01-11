import { Test, TestingModule } from '@nestjs/testing';
import { AdminManagementController } from './admin-management.controller';
import { AdminManagementService } from './admin-management.service';

describe('AdminManagementController', () => {
  let controller: AdminManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminManagementController],
      providers: [AdminManagementService],
    }).compile();

    controller = module.get<AdminManagementController>(
      AdminManagementController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
