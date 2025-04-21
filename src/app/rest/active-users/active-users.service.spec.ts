import { Test, TestingModule } from '@nestjs/testing';
import { ActiveUsersService } from './active-users.service';

describe('ActiveUsersService', () => {
  let service: ActiveUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActiveUsersService],
    }).compile();

    service = module.get<ActiveUsersService>(ActiveUsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
