import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';

// Factory function that creates a guard based on the userType
export function SoftJwtAuthGuard(): CanActivate {
  @Injectable()
  class RoleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      const authToken = request.headers.authorization;
      if (!authToken) return true;

      // split the token
      const token = authToken.split(' ')[1];
      const secret = process.env.JWT_SECRET;

      try {
        // Verify and decode the token
        const decoded: JwtPayload = jwt.verify(
          token,
          secret,
        ) as unknown as JwtPayload;
        request.user = {
          userId: decoded.userId,
          email: decoded.email,
          userType: decoded.userType,
        };
      } catch (error) {
        console.error('Invalid token:', error.message);
      }

      return true;
    }
  }

  return new RoleGuard();
}
