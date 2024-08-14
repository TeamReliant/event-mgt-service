/* eslint-disable prettier/prettier */
import { User } from '@app/rest/users/entities/user.entity';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const getCurrentUserByContext = (
  context: ExecutionContext,
): Partial<User> => {
  if (context.getType() === 'http') {
    return context.switchToHttp().getRequest().user;
  }
  if (context.getType() === 'rpc') {
    return context.switchToRpc().getData().user;
  }
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    getCurrentUserByContext(context),
);
