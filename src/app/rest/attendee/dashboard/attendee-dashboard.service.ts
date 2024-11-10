import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { UsersService } from '@app/rest/users/users.service';
import { EventView } from '@app/rest/attendee/dashboard/entities/event-view.entity';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';

@Injectable()
export class AttendeeDashboardService {
  constructor(
    private readonly _entityManager: EntityManager,
    private readonly _usersService: UsersService,
  ) {}

  async getDashboardData(userId: string) {
    const subQuery = this._entityManager
      .createQueryBuilder(Booking, 'booking')
      .select('booking.event') // Select the event ID
      .innerJoin('booking.event', 'event') // Join with the Event entity
      .where('event.eventStartDateAndTime > :currentDate', {
        currentDate: new Date(),
      })
      .andWhere('booking.processed = :processed', { processed: true })
      .andWhere('booking.paid = :paid', { paid: true })
      .orderBy('event.eventStartDateAndTime', 'ASC');

    // Main query to get bookings with the unique event IDs
    const upcomingEventBookings = await this._entityManager
      .createQueryBuilder(Booking, 'booking')
      .innerJoinAndSelect('booking.event', 'event')
      .where(`booking.event IN (${subQuery.getQuery()})`)
      .andWhere('booking.userId = :userId', { userId })
      .setParameters(subQuery.getParameters())
      .getMany();

    const recentlyViewedEvents = await this._entityManager
      .createQueryBuilder(EventView, 'view')
      .where('view.userId = :userId', { userId })
      .leftJoinAndSelect('view.event', 'event')
      .orderBy('event.createdAt', 'DESC')
      .limit(3)
      .getMany();

    const recommendedEvents = await this._entityManager
      .createQueryBuilder(Event, 'events')
      .orderBy('RANDOM()') // Fetch random rows each time
      .limit(3)
      .getMany();

    return {
      upcomingEvents: this.sortUpcomingEvents(upcomingEventBookings),
      recentlyViewedEvents: recentlyViewedEvents.map((view) => view.event),
      recommendedEvents,
    };
  }

  sortUpcomingEvents(bookings: Booking[]) {
    const events = [];
    const found = [];

    for (const booking of bookings) {
      if (found.includes(booking.event.id)) continue;
      found.push(booking.event.id);
      events.push(booking.event);
    }

    return events;
  }
}
