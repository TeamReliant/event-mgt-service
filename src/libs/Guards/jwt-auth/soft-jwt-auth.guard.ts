import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

// Factory function that creates a guard based on the userType
export function SoftJwtAuthGuard(): CanActivate {
  @Injectable()
  class RoleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      console.log(request.headers);

      return true;
    }
  }

  return new RoleGuard();
}
