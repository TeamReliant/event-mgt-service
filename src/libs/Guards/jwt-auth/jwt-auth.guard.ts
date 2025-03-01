import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '@app/rest/users/users.service';

@Injectable()
export default class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService, // Inject your AuthService or UserService
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isGuest = this.reflector.getAllAndOverride('isGuest', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isGuest) return true;

    const canActivate = await super.canActivate(context);
    if (!canActivate) throw new UnauthorizedException('UnAuthorized Access');

    // Extract the request object from the context
    const request = context.switchToHttp().getRequest();

    // Extract user information from the request
    const user = request.user;

    // Check if user exists in the database
    const userExists = await this.usersService.findOneById(user.userId);
    if (!userExists) throw new UnauthorizedException('UnAuthorized Access');

    if (user.blocked)
      throw new UnauthorizedException(
        'Your account has been blocked! Please contact the admin',
      );

    // update the last login date
    await this.usersService.findOneByIdAndUpdate(user.userId, {
      lastLoggedIn: new Date(),
    });

    return true;
  }
}
