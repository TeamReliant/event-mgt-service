import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '@app/rest/users/entities/user.entity';
import { UsersService } from '@app/rest/users/users.service';

@Injectable()
export class AdminManagementService {
  constructor(
    private readonly entityManager: EntityManager,
    private readonly usersService: UsersService,
  ) {}

  async getAllUsers() {
    var queryBuilder = await this.entityManager
      .createQueryBuilder(User, 'user')
      .select('user');

    return queryBuilder;
  }

  async blockUser(userId: string) {
    var userExists = await this.usersService.findOne(userId);
    if (!userExists) throw new BadRequestException('User does not exist');
    if (userExists.blocked === true)
      throw new BadRequestException('User is already blocked');

    userExists.blocked = true;
    await this.usersService.findOneByIdAndUpdate(userId, userExists);
  }

  async unblockUser(userId: string) {
    var userExists = await this.usersService.findOne(userId);
    if (!userExists) throw new BadRequestException('User does not exist');
    if (userExists.blocked === false)
      throw new BadRequestException('User is not blocked');

    userExists.blocked = false;
    await this.usersService.findOneByIdAndUpdate(userId, userExists);
  }
}
