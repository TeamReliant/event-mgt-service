import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TJwtPayload } from '@libs/types';

export const GetCurrentUserId = createParamDecorator(
  (_: undefined, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as TJwtPayload;
    return user?.userId;
  },
);
