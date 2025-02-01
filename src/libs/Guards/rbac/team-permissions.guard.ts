import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Inject,
  mixin,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntityManager } from 'typeorm';
import { UsersService } from '@app/rest/users/users.service';
import { UserType } from '@app/rest/users/enums/user-type';

export function TeamPermissionsGuard(allowedTeamPermissions: string[]): any {
  @Injectable()
  class MixinTeamPermissionsGuard implements CanActivate {
    constructor(
      private readonly reflector: Reflector,
      private readonly entityManager: EntityManager,
      private readonly usersService: UsersService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      const user = request.user; // Assuming user is attached to the request

      if (!user) throw new ForbiddenException('User not authenticated');
      if (user.userType !== UserType.ORGANIZER)
        throw new ForbiddenException('Only organizers can access this route');

      // Use `UsersService` or `EntityManager` to verify user permissions
      // const userPermissions = await this.usersService.getUserPermissions(user.id);
      //
      // if (
      //   !userPermissions.some((permission) =>
      //     allowedTeamPermissions.includes(permission),
      //   )
      // ) {
      //   throw new ForbiddenException(
      //     `You do not have permission to access this resource. Allowed roles: ${allowedTeamPermissions.join(', ')}`,
      //   );
      // }

      return true;
    }
  }

  return mixin(MixinTeamPermissionsGuard);
}
