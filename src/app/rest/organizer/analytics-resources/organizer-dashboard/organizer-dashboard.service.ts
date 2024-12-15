import { Injectable } from '@nestjs/common';
import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { User } from '@app/rest/users/entities/user.entity';
import { BookingStatus } from '@app/rest/attendee/bookings/enums/booking-status';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { EventStatus } from '@app/rest/organizer/event-resources/events/enums';

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

    console.log(
      `------------------------yesterday: ${yesterday}, ------- today: ${today}`,
    );

    // find the user with the userId
    const user = await this._entityManager.findOneBy(User, { id: userId });

    // Base query for current events, joining necessary relationships
    const queryBuilder = this._entityManager
      .createQueryBuilder(Event, 'events')
      .leftJoinAndSelect('events.tickets', 'tickets')
      .where('events.eventStatus = :status', { status: 'published' })
      .andWhere('events.userId = :userId', { userId });

    // Fetch current published events and total count
    const totalEvents = await queryBuilder.getCount();

    // Fetch the 5 most recent events
    const recentEvents = await this.getRecentEvents(queryBuilder);

    // count used tickets
    const usedBookingsCount = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.userId = :userId', { userId })
      .andWhere('bookings.status = :bookingStatus', {
        bookingStatus: BookingStatus.USED,
      })
      .getCount();

    // fetch successful bookings within the last 7 days
    const ticketsBookedYesterday = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.userId = :userId', { userId })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :yesterday', { yesterday })
      .andWhere('bookings.createdAt < :today', { today })
      .select(['bookings.id', 'bookings.unitAmount'])
      .getMany();

    const ticketsBookedToday = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.userId = :userId', { userId })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :today', { today })
      .select(['bookings.id', 'bookings.unitAmount'])
      .getMany();

    // fetch event published within the last 7 days
    const eventsPublishedYesterday = await this._entityManager
      .createQueryBuilder(Event, 'events')
      .leftJoinAndSelect('events.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('events.eventStatus = :status', {
        status: EventStatus.PUBLISHED,
      })
      .andWhere('events.createdAt >= :yesterday', { yesterday })
      .andWhere('events.createdAt < :today', { today })
      .getCount();

    const eventsPublishedToday = await this._entityManager
      .createQueryBuilder(Event, 'events')
      .leftJoinAndSelect('events.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('events.eventStatus = :status', {
        status: EventStatus.PUBLISHED,
      })
      .andWhere('events.createdAt >= :today', { today })
      .getCount();

    const allBookingCount = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.userId = :userId', { userId })
      .andWhere('bookings.processed = :status', { status: true })
      .getCount();

    const attendancePercentageChange =
      (usedBookingsCount / allBookingCount) * 100;

    // sum the unitAmount of the booking
    const totalRevenueYesterday = ticketsBookedYesterday.reduce(
      (acc, booking) => acc + +booking.unitAmount,
      0,
    );

    const totalRevenueToday = ticketsBookedToday.reduce(
      (acc, booking) => acc + +booking.unitAmount,
      0,
    );

    // console.log(
    //   `------------------------totalRevenueYesterday: ${ticketsBookedYesterday.length}, ------- totalRevenueToday: ${ticketsBookedToday.length}`
    // );

    return {
      totalRevenue: {
        value: user.totalRevenue,
        change: this._percentageChange(
          totalRevenueToday,
          totalRevenueYesterday,
        ),
      },
      ticketsSold: {
        value: user.ticketsSold,
        change: this._percentageChange(
          ticketsBookedToday.length,
          ticketsBookedYesterday.length,
        ),
      },
      publishedEvents: {
        value: totalEvents,
        change: this._percentageChange(
          eventsPublishedToday,
          eventsPublishedYesterday,
        ),
      },
      attendanceRate: {
        value: usedBookingsCount,
        change: this._roundToTwo(attendancePercentageChange),
      },
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

  _percentageChange(today: number, yesterday: number) {
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
  private async getRecentEvents(
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
