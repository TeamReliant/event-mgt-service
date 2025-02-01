import { Test, TestingModule } from '@nestjs/testing';
import { SystemRegisterController } from './system-register.controller';
import { SystemRegisterService } from './system-register.service';

describe('SystemRegisterController', () => {
  let controller: SystemRegisterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemRegisterController],
      providers: [SystemRegisterService],
    }).compile();

    controller = module.get<SystemRegisterController>(SystemRegisterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
