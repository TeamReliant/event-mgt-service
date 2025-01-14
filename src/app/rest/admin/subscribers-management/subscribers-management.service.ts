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
    const { email, search, status, dateRangeStart, dateRangeEnd } = query;

    const queryBuilder = this._entityManager
      .createQueryBuilder(Subscriber, 'subscribers')
      .where('1=1');

    if (search)
      queryBuilder.andWhere('subscribers.email ILIKE :email', {
        search: `%${search}%`,
      });

    if (email)
      queryBuilder.andWhere('subscribers.email = :email', {
        email: `%${email}%`,
      });

    if (status)
      queryBuilder.andWhere('subscribers.subscribed = :subscribed', {
        subscribed: status === 'subscribed',
      });

    if (dateRangeStart && dateRangeEnd)
      queryBuilder.andWhere(
        'event.createdAt BETWEEN :dateRangeStart AND :dateRangeEnd',
        { dateRangeStart, dateRangeEnd },
      );

    return queryBuilder;
  }

  async findOne(id: string, throwError: boolean = true): Promise<Subscriber> {
    const subscriber = await this._entityManager.findOne(Subscriber, {
      where: { id },
    });
    if (!subscriber && throwError)
      throw new NotFoundException(`Subscriber with id ${id} not found`);

    // return the subscriber
    return subscriber;
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
