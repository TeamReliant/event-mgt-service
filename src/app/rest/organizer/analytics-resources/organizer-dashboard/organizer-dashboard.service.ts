import { Injectable } from '@nestjs/common';
import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { User } from '@app/rest/users/entities/user.entity';
import { BookingStatus } from '@app/rest/attendee/bookings/enums/booking-status';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { EventStatus } from '@app/rest/organizer/event-resources/events/enums';
import { TicketCategory } from '@app/rest/organizer/ticket-resources/tickets/enums';

@Injectable()
export class OrganizerDashboardService {
  constructor(private readonly _entityManager: EntityManager) {}

  public async getAnalytics(userId: string) {
    // get the date of yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // get the current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // find the user with the userId
    const user = await this._entityManager.findOneBy(User, { id: userId });

    // Base query for current events, joining necessary relationships
    const queryBuilder = this._entityManager
      .createQueryBuilder(Event, 'events')
      .leftJoinAndSelect('events.tickets', 'tickets')
      .where('events.eventStatus = :status', { status: 'published' })
      .andWhere('events.userId = :userId', { userId });

    // Fetch the 5 most recent events
    const recentEvents = await this._getRecentEvents(queryBuilder);

    return {
      totalRevenue: await this._getTotalRevenueAnalytics(user),
      ticketsSold: await this._getTicketsAnalytics(user, TicketCategory.PAID),
      ticketsRsvp: await this._getTicketsAnalytics(user, TicketCategory.FREE),
      publishedEvents: await this._getPublishedEventsAnalytics(user),
      attendanceRate: await this._getAttendanceRateAnalytics(user),
      recentEvents,
      usefulResources: [
        {
          title: 'How to build a good audience and get fast results.',
          image:
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsTcK2i0b4xIMSuFgz322U9xH-wKcuX0Jz-A&s',
        },
        {
          title: 'How to build a good audience and get fast results.',
          image:
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsTcK2i0b4xIMSuFgz322U9xH-wKcuX0Jz-A&s',
        },
      ],
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
      value: usedBookingsCount,
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
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :yesterday', { yesterday })
      .andWhere('bookings.createdAt < :today', { today })
      .andWhere('bookings.category = :category', { category })
      .select(['bookings.id', 'bookings.unitAmount'])
      .getCount();

    const successfulBookingsToday = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.userId = :userId', { userId: user.id })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :today', { today })
      .andWhere('bookings.category = :category', { category })
      .select(['bookings.id', 'bookings.unitAmount'])
      .getCount();

    return {
      value:
        category === TicketCategory.PAID
          ? +user.ticketsSold
          : +user.ticketsRsvp,
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

  private _percentageChange(today: number, yesterday: number) {
    if (yesterday === 0 || today === 0) return 0;

    if (yesterday === 0) {
      if (today === 0) {
        // No change if both are zero
        return 0;
      }

      // value * 100 if yesterday is 0 and today is greater than 0
      return today * 100;
    }

    // Standard percentage change calculation if yesterday is non-zero
    return this._roundToTwo(((today - yesterday) / yesterday) * 100);
  }

  private _roundToTwo(digits: number) {
    return Math.ceil(digits * 100) / 100;
  }

  // Helper to fetch the most recent 5 events
  private async _getRecentEvents(
    queryBuilder: SelectQueryBuilder<Event>,
  ): Promise<Event[]> {
    const recentEvents = await queryBuilder
      .clone() // Clone the query to avoid modifying the base query
      .orderBy('events.createdAt', 'DESC')
      .limit(5)
      .getMany();

    // Remove unnecessary relations from recent events to reduce payload size
    return recentEvents.map((event) => {
      delete event.user;
      delete event.team;
      delete event.tickets;
      return event;
    });
  }
}
