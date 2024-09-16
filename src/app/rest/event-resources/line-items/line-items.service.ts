import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLineItemDto } from './dto/create-line-item.dto';
import { UpdateLineItemDto } from './dto/update-line-item.dto';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LineItem } from '@app/rest/event-resources/line-items/entities/line-item.entity';
import { Event } from '@app/rest/event-resources/events/entities/event.entity';

@Injectable()
export class LineItemsService {
  constructor(
    @InjectRepository(LineItem)
    private readonly _repo: Repository<LineItem>,
    private readonly _entityManager: EntityManager,
  ) {}

  async create(
    body: CreateLineItemDto,
    eventId: string,
    userId: string,
  ): Promise<LineItem> {
    // destructuring the body
    const { name } = body;

    // find the event, team and its members with the provided
    const event = await this._entityManager
      .createQueryBuilder(Event, 'event')
      .leftJoinAndSelect('event.team', 'team')
      .leftJoinAndSelect('event.user', 'user')
      .leftJoinAndSelect('team.members', 'members')
      .where('event.id = :eventId', { eventId })
      .getOne();

    // check if the event exists
    if (!event)
      throw new NotFoundException(`Event with id ${eventId} not found`);

    // check if the current user is the owner of the event
    if (event.user?.id !== userId)
      throw new NotFoundException(
        'Authenticated user is not the owner of the event',
      );

    // check if the line item name already exists
    const lineItem = await this._repo.findOneBy({ name });
    if (lineItem) throw new NotFoundException('Line item name already exists');

    // create a new line item
    const newLineItem = this._repo.create({ ...body, event });
    return this._repo.save(newLineItem);
  }

  findAll(eventId: string, { ...query }): SelectQueryBuilder<LineItem> {
    const queryBuilder = this._repo
      .createQueryBuilder('lineItems')
      .where('lineItems.eventId = :eventId', { eventId });

    if (query.search) {
      const search = query.search as string;
      queryBuilder.andWhere(`lineItems.name LIKE :search`, {
        search: `%${search}%`,
      });
    }

    return queryBuilder;
  }

  async findOne(
    eventId: string,
    id: string,
    throwException: boolean = true,
  ): Promise<LineItem> {
    const item = await this._repo
      .createQueryBuilder('lineItem')
      .where('lineItem.id = :id', { id })
      .andWhere('lineItem.eventId = :eventId', { eventId })
      .getOne();

    if (!item && throwException)
      throw new NotFoundException(`Line item with id ${id} not found`);

    return item;
  }

  async update(
    eventId: string,
    id: string,
    userId: string,
    updateLineItemDto: UpdateLineItemDto,
  ) {
    // find the event, team and its members with the provided
    const event = await this._entityManager
      .createQueryBuilder(Event, 'event')
      .leftJoinAndSelect('event.team', 'team')
      .leftJoinAndSelect('event.user', 'user')
      .leftJoinAndSelect('team.members', 'members')
      .where('event.id = :eventId', { eventId })
      .getOne();

    // check if the event exists
    if (!event)
      throw new NotFoundException(`Event with id ${eventId} not found`);

    // check if the current user is the owner of the event

    if (event.user?.id !== userId)
      throw new NotFoundException(
        'Authenticated user is not the owner of the event',
      );

    // find the line item
    const lineItem = await this.findOne(eventId, id);

    // update the line item
    const updatedLineItem = this._repo.merge(lineItem, updateLineItemDto);
    return this._repo.save(updatedLineItem);
  }

  async remove(eventId: string, id: string, userId: string) {
    // find the event, team and its members with the provided
    const event = await this._entityManager
      .createQueryBuilder(Event, 'event')
      .leftJoinAndSelect('event.team', 'team')
      .leftJoinAndSelect('event.user', 'user')
      .leftJoinAndSelect('team.members', 'members')
      .where('event.id = :eventId', { eventId })
      .getOne();

    // check if the event exists
    if (!event)
      throw new NotFoundException(`Event with id ${eventId} not found`);

    // check if the current user is the owner of the event
    if (event.user?.id !== userId)
      throw new NotFoundException(
        'Authenticated user is not the owner of the event',
      );

    // find the line item
    const lineItem = await this.findOne(eventId, id);

    // remove the line item
    return this._repo.remove(lineItem);
  }
}
