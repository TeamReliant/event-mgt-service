import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLineItemDto } from './dto/create-line-item.dto';
import { UpdateLineItemDto } from './dto/update-line-item.dto';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LineItem } from '@app/rest/event-resources/line-items/entities/line-item.entity';
import { Event } from '@app/rest/event-resources/events/entities/event.entity';
import { subDays } from 'date-fns';

@Injectable()
export class LineItemsService {
  constructor(
    @InjectRepository(LineItem)
    private readonly _repo: Repository<LineItem>,
    private readonly _entityManager: EntityManager,
  ) {}

  async getAnaylytics(eventId: string) {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 7);
    const fourteenDaysAgo = subDays(today, 14);

    // Fetch total budget, total expenses, available budget for the last 7 days
    const currentPeriod = await this._repo
      .createQueryBuilder('line_item')
      .select('SUM(line_item.intendedBudget)', 'totalBudget')
      .addSelect('SUM(line_item.amountSpent)', 'totalExpenses')
      .addSelect(
        'SUM(line_item.intendedBudget) - SUM(line_item.amountSpent)',
        'availableBudget',
      )
      .where('line_item.eventId = :eventId', { eventId })
      .andWhere('line_item.createdAt BETWEEN :sevenDaysAgo AND :today', {
        sevenDaysAgo,
        today,
      })
      .getRawOne();

    // Fetch total budget, total expenses, available budget for the previous 7 days
    const previousPeriod = await this._repo
      .createQueryBuilder('line_item')
      .select('SUM(line_item.intendedBudget)', 'totalBudget')
      .addSelect('SUM(line_item.amountSpent)', 'totalExpenses')
      .addSelect(
        'SUM(line_item.intendedBudget) - SUM(line_item.amountSpent)',
        'availableBudget',
      )
      .where('line_item.eventId = :eventId', { eventId })
      .andWhere(
        'line_item.createdAt BETWEEN :fourteenDaysAgo AND :sevenDaysAgo',
        {
          fourteenDaysAgo,
          sevenDaysAgo,
        },
      )
      .getRawOne();

    // Convert current and previous values to numbers
    const currentBudget = parseFloat(currentPeriod.totalBudget || 0);
    const currentExpenses = parseFloat(currentPeriod.totalExpenses || 0);
    const currentAvailableBudget = parseFloat(
      currentPeriod.availableBudget || 0,
    );

    const previousBudget = parseFloat(previousPeriod.totalBudget || 0);
    const previousExpenses = parseFloat(previousPeriod.totalExpenses || 0);
    const previousAvailableBudget = parseFloat(
      previousPeriod.availableBudget || 0,
    );

    // Calculate percentage changes
    const budgetChange =
      previousBudget > 0
        ? ((currentBudget - previousBudget) / previousBudget) * 100
        : 0;

    const expensesChange =
      previousExpenses > 0
        ? ((currentExpenses - previousExpenses) / previousExpenses) * 100
        : 0;

    const availableBudgetChange =
      previousAvailableBudget > 0
        ? ((currentAvailableBudget - previousAvailableBudget) /
            previousAvailableBudget) *
          100
        : 0;

    return {
      current: {
        totalBudget: currentBudget,
        totalExpenses: currentExpenses,
        availableBudget: currentAvailableBudget,
        grossIncome: 0,
        netIncome: 0,
      },
      previous: {
        totalBudget: previousBudget,
        totalExpenses: previousExpenses,
        availableBudget: previousAvailableBudget,
        grossIncome: 0,
        netIncome: 0,
      },
      percentageChange: {
        budgetChange,
        expensesChange,
        availableBudgetChange,
        grossIncome: 0,
        netIncome: 0,
      },
    };
  }

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
    const lineItem = await this._repo
      .createQueryBuilder('lineItem')
      .leftJoinAndSelect('lineItem.event', 'event')
      .where('event.id = :eventId', { eventId })
      .andWhere('lineItem.name = :name', { name })
      .getOne();

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
      queryBuilder.andWhere(`lineItems.name ILIKE :search`, {
        search: `%${search}%`,
      });
    }

    const { status, category } = query;

    if (category)
      queryBuilder.andWhere('LOWER(lineItems.category) = LOWER(:category)', {
        category,
      });

    if (status === 'near-budget')
      queryBuilder.andWhere(
        'lineItems.amountSpent BETWEEN lineItems.intendedBudget * 0.9 AND lineItems.intendedBudget',
      );

    if (status === 'on-track')
      queryBuilder.andWhere(
        'lineItems.amountSpent < lineItems.intendedBudget * 0.9',
      );

    if (status === 'over-budget')
      queryBuilder.andWhere('lineItems.amountSpent > lineItems.intendedBudget');

    return queryBuilder;
  }

  async findCategories(eventId: string, { ...query }): Promise<string[]> {
    const queryBuilder = this._repo
      .createQueryBuilder('lineItems')
      .select('DISTINCT lineItems.category') // Select distinct categories
      .where('lineItems.eventId = :eventId', { eventId });

    if (query.search) {
      const search = query.search as string;
      queryBuilder.andWhere('lineItems.name LIKE :search', {
        search: `%${search}%`,
      });
    }

    const result = await queryBuilder.getRawMany(); // Execute the query and get results

    // Extract and return just the categories from the raw results
    return result.map((row) => row.category);
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
