import { Injectable } from '@nestjs/common';
import { Between, EntityManager, IsNull } from 'typeorm';
import { BookingStatus } from '@app/rest/attendee/bookings/enums/booking-status';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { EventView } from '@app/rest/attendee/dashboard/entities/event-view.entity';
import { TicketCategory } from '@app/rest/organizer/ticket-resources/tickets/enums';
import { FreeTicketReaction } from '@app/rest/attendee/bookings/enums/free-ticket-reaction';
import { DateTime, DateTimeUnit } from 'luxon';
import { mapToIanaTimezone } from '@libs/helpers/char-generator';
import * as moment from 'moment-timezone';

@Injectable()
export class EventAnalyticsService {
  constructor(private readonly entityManager: EntityManager) {
  }

  async getAnalytics(eventId: string, { ...query }) {
    // get the date of yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // get the current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // find the user with the given userId
    const event = await this.entityManager
      .createQueryBuilder(Event, 'event')
      .where('event.id = :eventId', { eventId })
      .getOne();

    // check if the neccessary queries for page views are supplied
    const { dateRangeStart, dateRangeEnd, range, timezone } = query;
    let pageViews = {};
    if (dateRangeStart && dateRangeEnd && range) {
      pageViews = await this._getEventPageViews(
        eventId,
        dateRangeStart,
        dateRangeEnd,
        range,
        timezone,
      );
    }

    return {
      grossRevenue: await this._getGrossRevenueAnalytics(event),
      netRevenue: await this._getNetRevenueAnalytics(event),
      ticketsSold: await this._getTicketsAnalytics(event, TicketCategory.PAID),
      ticketsRsvp: await this._getTicketsAnalytics(event, TicketCategory.FREE),
      ticketsScanned: await this._getScannedTicketsAnalytics(event),
      attendanceRate: await this._getAttendanceRate(event),
      pageViews,
    };
  }

  private async _getAttendanceRate(event: Event) {
    // count existing complimentary tickets
    event.totalNumberOfComplimentaryTickets = await this.entityManager
      .createQueryBuilder(Booking, 'bookings')
      .where('bookings.eventId = :eventId', { eventId: event.id })
      .andWhere('bookings.category = :category', {
        category: TicketCategory.COMPLIMENTARY,
      })
      .getCount();

    await this.entityManager.save(Event, event);

    const {
      id,
      totalNumberOfTicketsSold,
      totalNumberOfTicketsRsvp,
      totalNumberOfComplimentaryTickets,
    } = event;

    // fetch ticket scanned
    const ticketsScanned = await this.entityManager
      .createQueryBuilder(Booking, 'bookings')
      .where('bookings.eventId = :eventId', { eventId: id })
      .andWhere('bookings.status = :status', { status: BookingStatus.USED })
      .getCount();

    // calculate Attendance rate
    const attendanceRate =
      (ticketsScanned /
        (totalNumberOfTicketsSold +
          totalNumberOfTicketsRsvp +
          totalNumberOfComplimentaryTickets)) *
      100;

    // calculate percentage change
    const percentageChange =
      (attendanceRate * (totalNumberOfTicketsSold + totalNumberOfTicketsRsvp)) /
      100;

    return {
      value: Math.ceil(attendanceRate * 100) / 100,
      change: Math.ceil(percentageChange * 100) / 100,
    };
  }

  private async _getTicketsAnalytics(event: Event, category: TicketCategory) {
    if (category === TicketCategory.FREE) {
      // count all free booking
      event.totalNumberOfTicketsRsvp = await this.entityManager
        .createQueryBuilder(Booking, 'bookings')
        .leftJoinAndSelect('bookings.event', 'event')
        .where('event.id = :eventId', { eventId: event.id })
        .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
        .andWhere('bookings.category = :category', { category })
        .andWhere('bookings.reaction != :reaction', {
          reaction: FreeTicketReaction.NOT_GOING,
        })
        .getCount();

      await this.entityManager.save(Event, event);
    }

    // get the date of yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // get the current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // fetch successful bookings within the last 7 days
    const yesterdayBookings = this.entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.id = :eventId', { eventId: event.id })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :yesterday', { yesterday })
      .andWhere('bookings.createdAt < :today', { today })
      .andWhere('bookings.category = :category', { category });

    if (category === TicketCategory.FREE) {
      yesterdayBookings.andWhere('bookings.reaction != :reaction', {
        reaction: FreeTicketReaction.NOT_GOING,
      });
    }

    yesterdayBookings.select(['bookings.id', 'bookings.unitAmount']);

    const todayBookings = this.entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.id = :eventId', { eventId: event.id })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :today', { today })
      .andWhere('bookings.category = :category', { category });

    if (category === TicketCategory.FREE) {
      todayBookings.andWhere('bookings.reaction != :reaction', {
        reaction: FreeTicketReaction.NOT_GOING,
      });
    }

    todayBookings.select(['bookings.id', 'bookings.unitAmount']);

    return {
      value:
        category === TicketCategory.PAID
          ? +event.totalNumberOfTicketsSold
          : +event.totalNumberOfTicketsRsvp,
      change: this._percentageChange(
        await todayBookings.getCount(),
        await yesterdayBookings.getCount(),
      ),
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

    // fetch successful bookings within the last 7 days
    const successfulBookingsTillYesterday = await this.entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.id = :eventId', { eventId: event.id })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :yesterday', { yesterday })
      .select(['bookings.id', 'bookings.unitAmount'])
      .getMany();

    const successfulBookingsTillToday = await this.entityManager
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

    return {
      value: +event.revenue,
      change: this._percentageChange(
        netRevenueTillToday,
        netRevenueTillYesterday,
      ),
    };
  }

  private async _getScannedTicketsAnalytics(event: Event) {
    // get the date of yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // get the current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // fetch ticket scanned
    const ticketsScanned = await this.entityManager
      .createQueryBuilder(Booking, 'bookings')
      .where('bookings.eventId = :eventId', { eventId: event.id })
      // .andWhere('bookings.transfer_status != :transferStatus', {
      //   transferStatus: TicketTransferStatus.TRANSFERRED,
      // })
      .andWhere('bookings.status = :status', { status: BookingStatus.USED })
      .getCount();

    const ticketsScannedToday = await this.entityManager
      .createQueryBuilder(Booking, 'bookings')
      .where('bookings.eventId = :eventId', { eventId: event.id })
      // .andWhere('bookings.transfer_status != :transferStatus', {
      //   transferStatus: TicketTransferStatus.TRANSFERRED,
      // })
      .andWhere('bookings.createdAt >= :today', { today })
      .andWhere('bookings.status = :status', { status: BookingStatus.USED })
      .getCount();

    const ticketsScannedYesterday = await this.entityManager
      .createQueryBuilder(Booking, 'bookings')
      .where('bookings.eventId = :eventId', { eventId: event.id })
      // .andWhere('bookings.transfer_status != :transferStatus', {
      //   transferStatus: TicketTransferStatus.TRANSFERRED,
      // })
      .andWhere('bookings.createdAt >= :yesterday', { yesterday })
      .andWhere('bookings.createdAt < :today', { today })
      .andWhere('bookings.status = :status', { status: BookingStatus.USED })
      .getCount();

    return {
      value: +ticketsScanned,
      change: this._percentageChange(
        ticketsScannedToday,
        ticketsScannedYesterday,
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
    const successfulBookingsYesterday = await this.entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.id = :eventId', { eventId: event.id })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :yesterday', { yesterday })
      .andWhere('bookings.createdAt < :today', { today })
      .select(['bookings.id', 'bookings.unitAmount'])
      .getMany();

    const successfulBookingsToday = await this.entityManager
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
      value: +event.revenue + +event.totalStripeFee + +event.totalPlatformFee,
      change: this._percentageChange(grossRevenueToday, grossRevenueYesterday),
    };
  }

  private _roundToTwo(digits: number) {
    return Math.ceil(digits * 100) / 100;
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

  private async _getEventPageViews(
    eventId: string,
    dateRangeStart: string,
    dateRangeEnd: string,
    range: 'daily' | 'weekly' | 'monthly',
    timezone: string = 'UTC+00:00',
  ) {
    // Normalize and convert to IANA format
    timezone = timezone.replace(/\s/g, '+').replace(':00', '');
    const ianaTimezone = mapToIanaTimezone(timezone);

    // Fetch event views
    const eventViews = await this.entityManager.find(EventView, {
      where: {
        event: { id: eventId },
        createdAt: Between(new Date(dateRangeStart), new Date(dateRangeEnd)),
        deletedAt: IsNull(), // Exclude soft-deleted
      },
      relations: ['event', 'user'],
    });

    // Set up time buckets
    const groupedData: Record<string, number> = {};
    const start = moment.tz(dateRangeStart, ianaTimezone);
    const end = moment.tz(dateRangeEnd, ianaTimezone);

    let cursor = start.clone();

    while (cursor.isSameOrBefore(end, 'day')) {
      let label: string;

      if (range === 'daily') {
        label = cursor.format('MMM D');
        cursor.add(1, 'day');
      } else if (range === 'weekly') {
        const weekStart = cursor.clone().startOf('isoWeek');
        const weekEnd = cursor.clone().endOf('isoWeek');
        label = `${weekStart.format('MMM D')} - ${weekEnd.format('MMM D')}`;
        cursor = weekEnd.add(1, 'day');
      } else if (range === 'monthly') {
        label = cursor.format('MMM');
        cursor.add(1, 'month');
      }

      if (label) groupedData[label] = 0;
    }

    // Populate counts
    for (const view of eventViews) {
      const created = moment.tz(view.createdAt, ianaTimezone);

      let label: string;

      if (range === 'daily') {
        label = created.format('MMM D');
      } else if (range === 'weekly') {
        const weekStart = created.clone().startOf('isoWeek');
        const weekEnd = created.clone().endOf('isoWeek');
        label = `${weekStart.format('MMM D')} - ${weekEnd.format('MMM D')}`;
      } else if (range === 'monthly') {
        label = created.format('MMM');
      }

      if (groupedData[label] !== undefined) {
        groupedData[label]++;
      }
    }

    return groupedData;
  }

  // private async _getEventPageViews(
  //   eventId: string,
  //   dateRangeStart: string,
  //   dateRangeEnd: string,
  //   range: 'daily' | 'weekly' | 'monthly',
  //   timezone: string = 'UTC+00:00',
  // ) {
  //   // Normalize 'UTC+1:00' to 'UTC+1' and map to IANA
  //   timezone = timezone.replace(/\s/g, '+').replace(':00', '');
  //   const ianaTimezone = mapToIanaTimezone(timezone);
  //
  //   const rangeMapping = {
  //     daily: 'day',
  //     weekly: 'week',
  //     monthly: 'month',
  //   };
  //   const pgRange = rangeMapping[range];
  //
  //   // Build start and end of day in user's timezone
  //   const userStart = DateTime.fromISO(dateRangeStart, {
  //     zone: ianaTimezone,
  //   }).startOf(pgRange as any);
  //   const userEnd = DateTime.fromISO(dateRangeEnd, {
  //     zone: ianaTimezone,
  //   }).endOf(pgRange as any);
  //
  //   // Convert to UTC for querying
  //   const startUtc = userStart.toUTC().toJSDate();
  //   const endUtc = userEnd.toUTC().toJSDate();
  //
  //   const queryBuilder = this.entityManager
  //     .createQueryBuilder(EventView, 'views')
  //     .select(
  //       `DATE_TRUNC('${pgRange}', views.createdAt AT TIME ZONE 'UTC' AT TIME ZONE :userTz)`,
  //       'timeGroup',
  //     )
  //     .addSelect('COUNT(views.id)', 'viewCount')
  //     .where('views.eventId = :eventId', { eventId })
  //     .andWhere('views.createdAt BETWEEN :start AND :end', {
  //       start: startUtc,
  //       end: endUtc,
  //     })
  //     .groupBy(
  //       `DATE_TRUNC('${pgRange}', views.createdAt AT TIME ZONE 'UTC' AT TIME ZONE :userTz)`,
  //     )
  //     .orderBy(
  //       `DATE_TRUNC('${pgRange}', views.createdAt AT TIME ZONE 'UTC' AT TIME ZONE :userTz)`,
  //       'ASC',
  //     )
  //     .setParameter('userTz', ianaTimezone);
  //
  //   const rawResults = await queryBuilder.getRawMany();
  //
  //   const resultMap = new Map<string, number>();
  //   rawResults.forEach(({ timeGroup, viewCount }) => {
  //     const time = DateTime.fromJSDate(timeGroup, {
  //       zone: ianaTimezone,
  //     }).startOf(pgRange as any);
  //     resultMap.set(time.toISODate(), parseInt(viewCount, 10));
  //   });
  //
  //   // Generate full range
  //   const fullRange: string[] = [];
  //   let cursor = userStart.startOf(pgRange as any);
  //   while (cursor <= userEnd) {
  //     fullRange.push(cursor.toISODate());
  //
  //     if (range === 'daily') cursor = cursor.plus({ days: 1 });
  //     else if (range === 'weekly') cursor = cursor.plus({ weeks: 1 });
  //     else if (range === 'monthly') cursor = cursor.plus({ months: 1 });
  //   }
  //
  //   // Format results
  //   const formattedResults: Record<string, number> = {};
  //   fullRange.forEach((periodISO) => {
  //     const date = DateTime.fromISO(periodISO, { zone: ianaTimezone });
  //
  //     if (range === 'daily') {
  //       const label = date.toFormat('MMM dd');
  //       formattedResults[label] = resultMap.get(periodISO) || 0;
  //     } else if (range === 'weekly') {
  //       const weekStart = date;
  //       const weekEnd = date.plus({ days: 6 });
  //       const label = `${weekStart.toFormat('MMM dd')} - ${weekEnd.toFormat('MMM dd')}`;
  //       formattedResults[label] = resultMap.get(periodISO) || 0;
  //     } else if (range === 'monthly') {
  //       const label = date.toFormat('MMM yyyy');
  //       formattedResults[label] = resultMap.get(periodISO) || 0;
  //     }
  //   });
  //
  //   return formattedResults;
  // }


}
