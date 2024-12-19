import { Test, TestingModule } from '@nestjs/testing';
import { SystemRegisterService } from './system-register.service';

describe('SystemRegisterService', () => {
  let service: SystemRegisterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SystemRegisterService],
    }).compile();

    service = module.get<SystemRegisterService>(SystemRegisterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
