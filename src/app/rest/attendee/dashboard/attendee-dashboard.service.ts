import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { UsersService } from '@app/rest/users/users.service';
import { EventView } from '@app/rest/attendee/dashboard/entities/event-view.entity';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import {
  EventStatus,
  EventVisibility,
} from '@app/rest/organizer/event-resources/events/enums';
import { BookingStatus } from '@app/rest/attendee/bookings/enums/booking-status';
import { User } from '@app/rest/users/entities/user.entity';

@Injectable()
export class AttendeeDashboardService {
  constructor(
    private readonly _entityManager: EntityManager,
    private readonly _usersService: UsersService,
  ) {}

  async getDashboardData({ userId, latitude, longitude }) {
    const user = await this._usersService.findOneById(userId);

    const subQuery = this._entityManager
      .createQueryBuilder(Booking, 'booking')
      .select('booking.event') // Select the event ID
      .innerJoin('booking.event', 'event') // Join with the Event entity
      .where('event.eventStartDateAndTime > :currentDate', {
        currentDate: new Date(),
      })
      // .andWhere('booking.processed = :processed', { processed: true })
      // .andWhere('booking.paid = :paid', { paid: true })
      .andWhere('booking.status = :bookingStatus', {
        bookingStatus: BookingStatus.VALID,
      })
      .orderBy('event.eventStartDateAndTime', 'ASC');

    // Main query to get bookings with the unique event IDs
    const upcomingEventBookings = await this._entityManager
      .createQueryBuilder(Booking, 'booking')
      .innerJoinAndSelect('booking.event', 'event')
      .innerJoinAndSelect('event.user', 'user')
      .innerJoinAndSelect('event.tickets', 'tickets')
      .where(`booking.event IN (${subQuery.getQuery()})`)
      .andWhere('booking.userId = :userId', { userId })
      .setParameters(subQuery.getParameters())
      .getMany();

    const recentlyViewedEvents = await this._entityManager
      .createQueryBuilder(EventView, 'view')
      .leftJoinAndSelect('view.event', 'event')
      .innerJoinAndSelect('event.user', 'user')
      // .leftJoinAndSelect('event.tickets', 'tickets')
      .where('view.userId = :userId', { userId })
      .orderBy('view.updatedAt', 'DESC')
      .limit(10)
      .getMany();

    let recommendedEvents: Event[];
    if (latitude && longitude) {
      recommendedEvents = await this.getLatLongRecommendedEvents({
        latitude,
        longitude,
      });
    } else {
      recommendedEvents = await this._entityManager
        .createQueryBuilder(Event, 'events')
        .innerJoinAndSelect('events.user', 'user')
        .leftJoinAndSelect('events.tickets', 'tickets')
        .where('events.eventVisibility = :eventVisibility', {
          eventVisibility: EventVisibility.PUBLIC,
        })
        .andWhere('events.eventStatus = :eventStatus', {
          eventStatus: EventStatus.PUBLISHED,
        })
        .orderBy('RANDOM()')
        .limit(10)
        .getMany();
    }

    return {
      upcomingEvents: this.sortUpcomingEvents(upcomingEventBookings),
      recentlyViewedEvents: recentlyViewedEvents.map((view) => view.event),
      recommendedEvents,
    };
  }

  // async getCountryRecommendedEvents(user: User) {
  //   return await this._entityManager
  //     .createQueryBuilder(Event, 'events')
  //     .innerJoinAndSelect('events.user', 'user')
  //     .leftJoinAndSelect('events.tickets', 'tickets')
  //     .where('events.eventVisibility = :eventVisibility', {
  //       eventVisibility: EventVisibility.PUBLIC,
  //     })
  //     .andWhere('events.eventStatus = :eventStatus', {
  //       eventStatus: EventStatus.PUBLISHED,
  //     })
  //     .orderBy('events.createdAt', 'DESC')
  //     .limit(10)
  //     .getMany();
  // }

  async getLatLongRecommendedEvents({ latitude, longitude }) {
    const radius = 5000;
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    return await this._entityManager
      .createQueryBuilder(Event, 'events')
      .innerJoinAndSelect('events.user', 'user')
      .leftJoinAndSelect('events.tickets', 'tickets')
      .where('events.eventVisibility = :eventVisibility', {
        eventVisibility: EventVisibility.PUBLIC,
      })
      .andWhere('events.eventStatus = :eventStatus', {
        eventStatus: EventStatus.PUBLISHED,
      })
      .andWhere(
        '(CAST(event.latitude AS float) != 0 OR CAST(event.longitude AS float) != 0)',
      )
      .addSelect(
        `(
            6371 * acos(
              least(1::float,
                cos(radians(:lat::float)) *
                cos(radians(CAST(event.latitude AS float))) *
                cos(radians(CAST(event.longitude AS float)) - radians(:lon::float)) +
                sin(radians(:lat::float)) *
                sin(radians(CAST(event.latitude AS float)))
              )
            )
          )`,
        'distance',
      )
      .addSelect('event.latitude', 'event_latitude')
      .addSelect('event.longitude', 'event_longitude')
      .andWhere(
        `(
            6371 * acos(
              least(1::float,
                cos(radians(:lat::float)) *
                cos(radians(CAST(event.latitude AS float))) *
                cos(radians(CAST(event.longitude AS float)) - radians(:lon::float)) +
                sin(radians(:lat::float)) *
                sin(radians(CAST(event.latitude AS float)))
              )
            ) <= :radius
            OR (CAST(event.latitude AS float) = :lat AND CAST(event.longitude AS float) = :lon)
          )`,
        { lat, lon, radius },
      )
      .andWhere('event.latitude IS NOT NULL AND event.longitude IS NOT NULL')
      .orderBy('distance', 'ASC')
      .limit(10)
      .getMany();
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
