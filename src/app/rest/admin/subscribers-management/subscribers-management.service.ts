import { Injectable, NotFoundException } from '@nestjs/common';
import { events } from '@config/app.config';
import { EntityManager } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Subscriber } from '@app/rest/attendee/subscribers/entities/subscriber.entity';

@Injectable()
export class SubscribersManagementService {
  constructor(
    private readonly _entityManager: EntityManager,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  findAll({ ...query }) {
    const { email, subscribed, dateRangeStart, dateRangeEnd } = query;

    const queryBuilder = this._entityManager
      .createQueryBuilder(Subscriber, 'subscribers')
      .where('1=1');

    if (email)
      queryBuilder.andWhere('subscribers.email ILIKE :email', {
        email: `%${email}%`,
      });

    if (subscribed)
      queryBuilder.andWhere('subscribers.subscribed = :subscribed', {
        subscribed,
      });

    if (dateRangeStart && dateRangeEnd)
      queryBuilder.andWhere(
        'event.createdAt BETWEEN :dateRangeStart AND :dateRangeEnd',
        { dateRangeStart, dateRangeEnd },
      );

    return queryBuilder;
  }

  async export(userId: string): Promise<boolean> {
    await this.eventEmitter.emitAsync(
      events.EXPORT_ALL_SUBSCRIBERS_CSV,
      userId,
    );
    return true;
  }

  async remove(id: string): Promise<boolean> {
    const subscriber = await this._entityManager.findOneBy(Subscriber, { id });
    if (!subscriber) throw new NotFoundException('Subscriber not found');

    await this._entityManager.remove(Subscriber, subscriber);
    return true;
  }
}
