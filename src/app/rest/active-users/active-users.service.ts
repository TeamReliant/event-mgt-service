import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { ActiveUser } from '@app/rest/active-users/entities/active-user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@app/rest/users/entities/user.entity';

@Injectable()
export class ActiveUsersService {
  constructor(
    @InjectRepository(ActiveUser)
    private readonly _repo: Repository<ActiveUser>,
    private readonly _entityManager: EntityManager,
  ) {}

  async record(userId: string) {
    //check if the user already has a record for today
    const today = new Date();
    const existingRecordForToday = await this._repo
      .createQueryBuilder('active_users')
      .where('active_users.userId = :userId', { userId })
      .andWhere('DATE(created_at) = :today', {
        today: today.toISOString().split('T')[0],
      })
      .getOne();

    if (existingRecordForToday) {
      existingRecordForToday.frequency += 1;
      return await this._repo.save(existingRecordForToday);
    }

    const user = await this._entityManager.findOneBy(User, { id: userId });
    const record = this._repo.create({
      user,
      frequency: 1,
    });

    return await this._repo.save(record);
  }
}
