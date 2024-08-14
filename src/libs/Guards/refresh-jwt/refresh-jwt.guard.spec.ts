import { RefreshJwtGuard } from './refresh-jwt.guard';

describe('RefreshJwtGuard', () => {
  it('should be defined', () => {
    expect(new RefreshJwtGuard()).toBeDefined();
  });
});
