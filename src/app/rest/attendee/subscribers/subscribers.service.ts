import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscriber } from '@app/rest/attendee/subscribers/entities/subscriber.entity';
import { events } from '@config/app.config';
import { AllUsersExportEvent } from '@app/rest/admin/admin-management/events/export-all-users.event';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SubscribersService {
  constructor(
    @InjectRepository(Subscriber)
    private readonly _repo: Repository<Subscriber>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(body: CreateSubscriberDto): Promise<Subscriber> {
    const { email } = body;
    // check if the email already exists
    const subscriber = await this._repo.findOne({ where: { email } });
    if (subscriber) {
      // update the subscriber status to active in case it is inactive
      subscriber.subscribed = true;
      await this._repo.save(subscriber);
      return subscriber;
    }

    const newSubscriber = this._repo.create(body);
    return this._repo.save(newSubscriber);
  }

  async update(updateSubscriberDto: UpdateSubscriberDto): Promise<Subscriber> {
    const { email, subscribed } = updateSubscriberDto;

    // check if the email already exists
    const subscriber = await this._repo.findOne({ where: { email } });
    if (!subscriber) throw new NotFoundException(`Subscriber not found`);

    // update the subscriber record
    if (subscribed) subscriber.subscribed = subscribed === 'true';
    return this._repo.save(subscriber);
  }
}
