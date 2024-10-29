import {
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscriber } from '@app/rest/attendee/subscribers/entities/subscriber.entity';

@Injectable()
export class SubscribersService {
  constructor(
    @InjectRepository(Subscriber)
    private readonly _repo: Repository<Subscriber>,
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

  findAll() {
    return this._repo.createQueryBuilder('subscribers');
  }

  async findOne(id: string, throwError: boolean = true): Promise<Subscriber> {
    const subscriber = await this._repo.findOne({ where: { id } });
    if (!subscriber && throwError)
      throw new NotFoundException(`Subscriber with id ${id} not found`);

    // return the subscriber
    return subscriber;
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

  async remove(id: string): Promise<boolean> {
    const subscriber = await this.findOne(id);
    await this._repo.remove(subscriber);
    return true;
  }
}
