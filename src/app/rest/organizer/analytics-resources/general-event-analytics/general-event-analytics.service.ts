import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '@app/rest/users/entities/user.entity';
import { EventStatus } from '@app/rest/organizer/event-resources/events/enums';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { BookingStatus } from '@app/rest/attendee/bookings/enums/booking-status';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { Request } from 'express';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';

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

    const eventsCount = await this._entityManager
      .createQueryBuilder(User, 'user')
      .leftJoinAndSelect('user.events', 'events')
      .where('user.id = :userId', { userId })
      .andWhere('events.eventStatus = :status', {
        status: EventStatus.PUBLISHED,
      })
      .getCount();

    const usedBookingsCount = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.userId = :userId', { userId })
      .andWhere('bookings.status = :status', { status: BookingStatus.USED })
      .getCount();

    const allBookingCount = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.userId = :userId', { userId })
      .andWhere('bookings.processed = :status', { status: true })
      .getCount();

    const percentageChange = (usedBookingsCount / allBookingCount) * 100;

    // CALCULATING PERCENTAGE CHANGES
    // fetch successful bookings within the last 7 days
    const successfulBookingsWithin7Days = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.userId = :userId', { userId })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :sevenDaysAgo', { sevenDaysAgo })
      .andWhere('bookings.createdAt <= :today', { today })
      .select(['bookings.id', 'bookings.unitAmount'])
      .getMany();

    // fetch event published within the last 7 days
    const eventsPublishedWithin7Days = await this._entityManager
      .createQueryBuilder(Event, 'events')
      .leftJoinAndSelect('events.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('events.eventStatus = :status', {
        status: EventStatus.PUBLISHED,
      })
      .andWhere('events.createdAt >= :sevenDaysAgo', { sevenDaysAgo })
      .andWhere('events.createdAt <= :today', { today })
      .getCount();

    // fetch all events ever published by the user
    const totalEventsPublished = await this._entityManager
      .createQueryBuilder(Event, 'events')
      .leftJoinAndSelect('events.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('events.eventStatus = :status', {
        status: EventStatus.PUBLISHED,
      })
      .getCount();

    // sum the unitAmount of the booking
    const totalRevenueWithin7Days = successfulBookingsWithin7Days.reduce(
      (acc, booking) => acc + +booking.unitAmount,
      0,
    );

    // calculate the revenue percentage change
    const percentageChangeWithin7Days =
      (totalRevenueWithin7Days / user.totalRevenue) * 100;

    // calculate the ticketsSold percentage change
    const percentageChangeTicketsSoldWithin7Days =
      (successfulBookingsWithin7Days.length / user.ticketsSold) * 100;

    // calculate the events percentage change
    const percentageChangeEventsWithin7Days =
      (eventsPublishedWithin7Days / totalEventsPublished) * 100;

    return {
      totalRevenue: {
        value: user.totalRevenue,
        change: Math.ceil(percentageChangeWithin7Days * 100) / 100,
      },
      ticketsSold: {
        value: user.ticketsSold,
        change: Math.ceil(percentageChangeTicketsSoldWithin7Days * 100) / 100,
      },
      publishedEvents: {
        value: eventsCount,
        change: Math.ceil(percentageChangeEventsWithin7Days * 100) / 100,
      },
      attendanceRate: {
        value: usedBookingsCount,
        change: Math.ceil(percentageChange * 100) / 100,
      },
      events: await this.getEvents(userId, req),
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
}
