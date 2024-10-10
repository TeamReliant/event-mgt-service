import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

// Factory function that creates a guard based on the userType
export function RolesGuard(allowedUserTypes: string[]): CanActivate {
  @Injectable()
  class RoleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      const user = request.user; // Assuming user is attached to the request

      if (!user) throw new ForbiddenException('User not authenticated');
      if (!user.userType)
        throw new ForbiddenException(
          'Invalid access token, please sign in again',
        );

      // check the user type is part of the allowed roles
      if (!allowedUserTypes.includes(user.userType)) {
        throw new ForbiddenException(
          `You do not have permission to access this resource. Allowed roles: ${allowedUserTypes.join(', ')}`,
        );
      }

      return true;
    }
  }

  return new RoleGuard();
}
