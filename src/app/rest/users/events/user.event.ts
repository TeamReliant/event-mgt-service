import { User } from '../entities/user.entity';

export class UserEvent {
  constructor(public readonly user: User) {}
}
