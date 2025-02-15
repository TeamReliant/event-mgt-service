import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '@app/rest/users/entities/user.entity';
import { EventStatus } from '@app/rest/organizer/event-resources/events/enums';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { BookingStatus } from '@app/rest/attendee/bookings/enums/booking-status';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { Request } from 'express';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';
import { TicketCategory } from '@app/rest/organizer/ticket-resources/tickets/enums';

@Injectable()
export class GeneralEventAnalyticsService {
  constructor(private readonly _entityManager: EntityManager) {}

  async getGeneralEventAnalytics(userId: string, req: Request) {
    // get the date of 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(1, 0, 0, 0);

    // get the current date
    const today = new Date();
    today.setHours(24, 59, 59, 999);

    // find the user with the id
    const user = await this._entityManager
      .createQueryBuilder(User, 'user')
      .where('user.id = :userId', { userId })
      .getOne();

    return {
      totalRevenue: await this._getTotalRevenueAnalytics(user),
      ticketsSold: await this._getTicketsAnalytics(user, TicketCategory.PAID),
      ticketsRsvp: await this._getTicketsAnalytics(user, TicketCategory.FREE),
      publishedEvents: await this._getPublishedEventsAnalytics(user),
      attendanceRate: await this._getAttendanceRateAnalytics(user),
      events: await this.getEvents(userId, req),
    };
  }

  private async _getAttendanceRateAnalytics(user: User) {
    const usedBookingsCount = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.userId = :userId', { userId: user.id })
      .andWhere('bookings.status = :status', { status: BookingStatus.USED })
      .getCount();

    const allBookingCount = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.userId = :userId', { userId: user.id })
      .andWhere('bookings.processed = :status', { status: true })
      .getCount();

    const percentageChange = (usedBookingsCount / allBookingCount) * 100;

    return {
      value: +usedBookingsCount,
      change: Math.ceil(percentageChange * 100) / 100,
    };
  }

  private async _getPublishedEventsAnalytics(user: User) {
    // get the date of yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // get the current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalEvents = await this._entityManager
      .createQueryBuilder(Event, 'events')
      .leftJoinAndSelect('events.tickets', 'tickets')
      .where('events.eventStatus = :status', { status: 'published' })
      .andWhere('events.userId = :userId', { userId: user.id })
      .getCount();

    // fetch event published within the last 7 days
    const eventsPublishedYesterday = await this._entityManager
      .createQueryBuilder(Event, 'events')
      .leftJoinAndSelect('events.user', 'user')
      .where('user.id = :userId', { userId: user.id })
      .andWhere('events.eventStatus = :status', {
        status: EventStatus.PUBLISHED,
      })
      .andWhere('events.createdAt >= :yesterday', { yesterday })
      .andWhere('events.createdAt < :today', { today })
      .getCount();

    const eventsPublishedToday = await this._entityManager
      .createQueryBuilder(Event, 'events')
      .leftJoinAndSelect('events.user', 'user')
      .where('user.id = :userId', { userId: user.id })
      .andWhere('events.eventStatus = :status', {
        status: EventStatus.PUBLISHED,
      })
      .andWhere('events.createdAt >= :today', { today })
      .getCount();

    return {
      value: +totalEvents,
      change: this._percentageChange(
        eventsPublishedToday,
        eventsPublishedYesterday,
      ),
    };
  }

  private async _getTicketsAnalytics(user: User, category: TicketCategory) {
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
      .where('event.userId = :userId', { userId: user.id })
      .andWhere('bookings.category = :category', { category })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :yesterday', { yesterday })
      .andWhere('bookings.createdAt < :today', { today })
      .select(['bookings.id', 'bookings.unitAmount'])
      .getCount();

    const successfulBookingsToday = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.userId = :userId', { userId: user.id })
      .andWhere('bookings.category = :category', { category })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :today', { today })
      .select(['bookings.id', 'bookings.unitAmount'])
      .getCount();

    return {
      value: +user.ticketsSold,
      change: this._percentageChange(
        successfulBookingsToday,
        successfulBookingsYesterday,
      ),
    };
  }

  private async _getTotalRevenueAnalytics(user: User) {
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
      .where('event.userId = :userId', { userId: user.id })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :yesterday', { yesterday })
      .andWhere('bookings.createdAt < :today', { today })
      .select(['bookings.id', 'bookings.unitAmount'])
      .getMany();

    const successfulBookingsToday = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.userId = :userId', { userId: user.id })
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
      value: +user.totalRevenue,
      change: this._percentageChange(grossRevenueToday, grossRevenueYesterday),
    };
  }

  async getEvents(userId: string, req: Request): Promise<any> {
    // create a queryBuilder for events
    const eventsQueryBuilder = this._entityManager
      .createQueryBuilder(Event, 'events')
      .leftJoinAndSelect('events.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('events.eventStatus = :status', {
        status: EventStatus.PUBLISHED,
      });

    if (req.query?.search)
      eventsQueryBuilder.andWhere('events.name ILIKE :name', {
        name: `%${req.query.search}%`,
      });

    if (req.query.dateRangeStart && req.query.dateRangeEnd) {
      const startOfDay = new Date(req.query.dateRangeStart as string);
      startOfDay.setHours(1, 0, 0, 0);

      const endOfDay = new Date(req.query.dateRangeEnd as string);
      endOfDay.setHours(24, 59, 59, 999);

      eventsQueryBuilder.andWhere(
        'events.createdAt BETWEEN :dateRangeStart AND :dateRangeEnd',
        { dateRangeStart: startOfDay, dateRangeEnd: endOfDay },
      );
    }

    // order by createdAt
    eventsQueryBuilder.orderBy('events.createdAt', 'DESC');
    return await ResponseSerializer.applyHTEAOS(req, eventsQueryBuilder);
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

  _roundToTwo(digits: number) {
    return Math.ceil(digits * 100) / 100;
  }
}
