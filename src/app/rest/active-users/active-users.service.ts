import { Injectable, Logger } from '@nestjs/common';
import { Between, EntityManager, Repository } from 'typeorm';
import { ActiveUser } from '@app/rest/active-users/entities/active-user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@app/rest/users/entities/user.entity';
import { mapToIanaTimezone } from '@libs/helpers/char-generator';
import * as moment from 'moment-timezone';

@Injectable()
export class ActiveUsersService {
  constructor(
    @InjectRepository(ActiveUser)
    private readonly _repo: Repository<ActiveUser>,
    private readonly _entityManager: EntityManager,
  ) {}

  async getActiveUsersChart(
    dateRangeStart: Date,
    dateRangeEnd: Date,
    granularity: 'daily' | 'weekly' | 'monthly',
    timezone: string = 'UTC+01:00',
  ) {
    // Normalize and convert to IANA format
    timezone = timezone.replace(/\s/g, '+').replace(':00', '');
    const ianaTimezone = mapToIanaTimezone(timezone); // Assume you have a mapping util

    // Fetch data
    const activeUsers = await this._repo.find({
      where: {
        createdAt: Between(dateRangeStart, dateRangeEnd),
      },
      relations: ['user'],
    });

    // Transform and group
    const groupedData: Record<string, number> = {};
    const start = moment.tz(dateRangeStart, ianaTimezone);
    const end = moment.tz(dateRangeEnd, ianaTimezone);

    let cursor = start.clone();

    while (cursor.isSameOrBefore(end, 'day')) {
      let label: string;

      if (granularity === 'daily') {
        label = cursor.format('MMM D');
        cursor.add(1, 'day');
      } else if (granularity === 'weekly') {
        const weekStart = cursor.clone().startOf('isoWeek');
        const weekEnd = cursor.clone().endOf('isoWeek');
        label = `${weekStart.format('MMM D')} - ${weekEnd.format('MMM D')}`;
        cursor = weekEnd.add(1, 'day');
      } else if (granularity === 'monthly') {
        label = cursor.format('MMM');
        cursor.add(1, 'month');
      }

      if (label) groupedData[label] = 0;
    }

    for (const user of activeUsers) {
      const created = moment.tz(user.createdAt, ianaTimezone);

      let label: string;

      if (granularity === 'daily') {
        label = created.format('MMM D');
      } else if (granularity === 'weekly') {
        const weekStart = created.clone().startOf('isoWeek');
        const weekEnd = created.clone().endOf('isoWeek');
        label = `${weekStart.format('MMM D')} - ${weekEnd.format('MMM D')}`;
      } else if (granularity === 'monthly') {
        label = created.format('MMM');
      }

      if (groupedData[label] !== undefined) {
        groupedData[label]++;
      }
    }

    return groupedData;
  }

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
