import { UsersService } from '@app/rest/users/users.service';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class SubscriptionPlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UsersService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    //get restricted plans from RestrictedPlans decorator
    const restrictedPlans = this.reflector.get<string[]>(
      'restrictedPlans',
      context.getHandler(),
    );
    if (!restrictedPlans) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const user = request.user;

    const userDetails = await this.userService.findOneById(user.userId);

    if (!userDetails) {
      throw new ForbiddenException('User not found');
    }

    if (restrictedPlans.includes(userDetails.subscribedPlan)) {
      throw new ForbiddenException('Access denied, upgrade your plan.');
    }

    return true;
  }
}
