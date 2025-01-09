import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLineItemDto } from './dto/create-line-item.dto';
import { UpdateLineItemDto } from './dto/update-line-item.dto';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LineItem } from '@app/rest/organizer/event-resources/line-items/entities/line-item.entity';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { subDays } from 'date-fns';
import { ConfigService } from '@nestjs/config';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { BookingStatus } from '@app/rest/attendee/bookings/enums/booking-status';

@Injectable()
export class LineItemsService {
  constructor(
    @InjectRepository(LineItem)
    private readonly _repo: Repository<LineItem>,
    private readonly _entityManager: EntityManager,
  ) {}

  async create(body: CreateLineItemDto, eventId: string): Promise<LineItem> {
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
    // if (event.user?.id !== userId)
    //   throw new NotFoundException(
    //     'Authenticated user is not the owner of the event',
    //   );

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

    queryBuilder.orderBy('lineItems.createdAt', 'DESC');
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

    // if (event.user?.id !== userId)
    //   throw new NotFoundException(
    //     'Authenticated user is not the owner of the event',
    //   );

    // find the line item
    const lineItem = await this.findOne(eventId, id);

    // update the line item
    const updatedLineItem = this._repo.merge(lineItem, updateLineItemDto);
    return this._repo.save(updatedLineItem);
  }

  async remove(eventId: string, id: string) {
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
    // if (event.user?.id !== userId)
    //   throw new NotFoundException(
    //     'Authenticated user is not the owner of the event',
    //   );

    // find the line item
    const lineItem = await this.findOne(eventId, id);

    // remove the line item
    return this._repo.remove(lineItem);
  }

  async getAnalytics(eventId: string) {
    // get the date of 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(1, 0, 0, 0);

    // get the current date
    const today = new Date();
    today.setHours(24, 59, 59, 999);

    // find the event with the id
    const event = await this._entityManager
      .createQueryBuilder(Event, 'event')
      .leftJoinAndSelect('event.lineItems', 'lineItems')
      .where('event.id = :eventId', { eventId })
      .getOne();

    return {
      totalBudget: await this._getTotalBudgetAnalytics(event),
      totalExpense: await this._getTotalExpenseAnalytics(event),
      availableBudget: await this._getAvailableBudgetAnalytics(event),
      grossIncome: await this._getGrossRevenueAnalytics(event),
      netIncome: await this._getNetRevenueAnalytics(event),
    };
  }

  private async _getNetRevenueAnalytics(event: Event) {
    // get the date of yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // get the current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // fetch all event line items
    const eventLineItems = await this._entityManager
      .createQueryBuilder(LineItem, 'lineItems')
      .where('lineItems.eventId = :eventId', { eventId: event.id })
      .getMany();

    // fetch successful bookings within the last 7 days
    const successfulBookingsTillYesterday = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.id = :eventId', { eventId: event.id })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :yesterday', { yesterday })
      .select(['bookings.id', 'bookings.unitAmount'])
      .getMany();

    const successfulBookingsTillToday = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.id = :eventId', { eventId: event.id })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :today', { today })
      .select(['bookings.id', 'bookings.unitAmount'])
      .getMany();

    // sum the unitAmount of the booking
    const netRevenueTillYesterday = successfulBookingsTillYesterday.reduce(
      (acc, booking) => acc + +booking.unitAmount,
      0,
    );

    const netRevenueTillToday = successfulBookingsTillToday.reduce(
      (acc, booking) => acc + +booking.unitAmount,
      0,
    );

    const totalExpenses = eventLineItems.reduce(
      (acc, lineItem) => acc + +lineItem.amountSpent,
      0,
    );

    return {
      value: +event.revenue - totalExpenses,
      percentageDiff: this._percentageChange(
        netRevenueTillToday - totalExpenses,
        netRevenueTillYesterday - totalExpenses,
      ),
    };
  }

  private async _getGrossRevenueAnalytics(event: Event) {
    // get the date of yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // get the current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // fetch successful bookings within the last 7 days
    const successfulBookingsYesterday = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.id = :eventId', { eventId: event.id })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :yesterday', { yesterday })
      .andWhere('bookings.createdAt < :today', { today })
      .select(['bookings.id', 'bookings.unitAmount'])
      .getMany();

    const successfulBookingsToday = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.id = :eventId', { eventId: event.id })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :today', { today })
      .select(['bookings.id', 'bookings.unitAmount'])
      .getMany();

    // sum the unitAmount of the booking
    const grossRevenueYesterday = successfulBookingsYesterday.reduce(
      (acc, booking) => acc + +booking.unitAmount,
      0,
    );

    const grossRevenueToday = successfulBookingsToday.reduce(
      (acc, booking) => acc + +booking.unitAmount,
      0,
    );

    return {
      value: +event.revenue,
      percentageDiff: this._percentageChange(
        grossRevenueToday,
        grossRevenueYesterday,
      ),
    };
  }

  _roundToTwo(digits: number) {
    return Math.ceil(digits * 100) / 100;
  }

  private async _getAvailableBudgetAnalytics(event: Event) {
    const totalExpenses = await this._getTotalExpenseAnalytics(event);
    const totalBudget = await this._getTotalBudgetAnalytics(event);

    const availableBudget = totalBudget.value - totalExpenses.value;
    const percentageDiff =
      totalBudget.percentageDiff - totalExpenses.percentageDiff;

    return {
      value: this._roundToTwo(availableBudget),
      percentageDiff,
    };
  }

  private async _getTotalExpenseAnalytics(event: Event) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = subDays(today, 1);

    // calculate total sum of intendedBudget
    const totalBudget = event.lineItems.reduce(
      (acc, lineItem) => acc + +lineItem.amountSpent,
      0,
    );

    const totalAmountSpentToday = await this._repo
      .createQueryBuilder('lineItems')
      .where('lineItems.eventId = :eventId', { eventId: event.id })
      .andWhere('lineItems.createdAt >= :today', { today })
      .getMany();

    const totalAmountSpentYesterday = await this._repo
      .createQueryBuilder('lineItems')
      .where('lineItems.eventId = :eventId', { eventId: event.id })
      .andWhere('lineItems.createdAt >= :yesterday', { yesterday })
      .andWhere('lineItems.createdAt < :today', { today })
      .getMany();

    // calculate totalAmountSpentToday
    const totalAmountSpentAmountToday = totalAmountSpentToday.reduce(
      (acc, lineItem) => acc + +lineItem.amountSpent,
      0,
    );
    const totalAmountSpentAmountYesterday = totalAmountSpentYesterday.reduce(
      (acc, lineItem) => acc + +lineItem.amountSpent,
      0,
    );

    return {
      value: +totalBudget,
      percentageDiff: this._percentageChange(
        +totalAmountSpentAmountToday,
        +totalAmountSpentAmountYesterday,
      ),
    };
  }

  private async _getTotalBudgetAnalytics(event: Event) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = subDays(today, 1);

    // calculate total sum of intendedBudget
    const totalBudget = event.lineItems.reduce(
      (acc, lineItem) => acc + +lineItem.intendedBudget,
      0,
    );

    const totalBudgetToday = await this._repo
      .createQueryBuilder('lineItems')
      .where('lineItems.eventId = :eventId', { eventId: event.id })
      .andWhere('lineItems.createdAt >= :today', { today })
      .getMany();

    const totalBudgetYesterday = await this._repo
      .createQueryBuilder('lineItems')
      .where('lineItems.eventId = :eventId', { eventId: event.id })
      .andWhere('lineItems.createdAt >= :yesterday', { yesterday })
      .andWhere('lineItems.createdAt < :today', { today })
      .getMany();

    // calculate totalBudgetToday
    const totalBudgetAmountToday = totalBudgetToday.reduce(
      (acc, lineItem) => acc + +lineItem.intendedBudget,
      0,
    );
    const totalBudgetAmountYesterday = totalBudgetYesterday.reduce(
      (acc, lineItem) => acc + +lineItem.intendedBudget,
      0,
    );

    return {
      value: +totalBudget,
      percentageDiff: this._percentageChange(
        +totalBudgetAmountToday,
        +totalBudgetAmountYesterday,
      ),
    };
  }

  _percentageChange(today: number, yesterday: number) {
    if (yesterday === 0 || today === 0) return 0;

    if (yesterday === 0) {
      if (today === 0) {
        // No change if both are zero
        return 0;
      }

      // value * 100 if yesterday is 0 and today is greater than 0
      return 0; // today * 100;
    }

    // Standard percentage change calculation if yesterday is non-zero
    return this._roundToTwo(((today - yesterday) / yesterday) * 100);
  }
}
