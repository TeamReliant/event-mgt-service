import { Injectable, NotAcceptableException } from '@nestjs/common';
import { DateTime, FixedOffsetZone } from 'luxon';
import { EntityManager } from 'typeorm';
import { BookingStatus } from '@app/rest/attendee/bookings/enums/booking-status';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { EventView } from '@app/rest/attendee/dashboard/entities/event-view.entity';
import { TicketCategory } from '@app/rest/organizer/ticket-resources/tickets/enums';
import { FreeTicketReaction } from '@app/rest/attendee/bookings/enums/free-ticket-reaction';
import { parseTimezoneOffset } from '@libs/helpers/char-generator';
import * as moment from 'moment-timezone';

@Injectable()
export class EventAnalyticsService {
  constructor(private readonly entityManager: EntityManager) {}

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

  // private async _getEventPageViews(
  //   eventId: string,
  //   dateRangeStart: string,
  //   dateRangeEnd: string,
  //   range: 'daily' | 'weekly' | 'monthly',
  //   timezone: string,
  // ) {
  //   // Handle timezone formatting
  //   timezone = timezone.replace(/\s/g, '+');
  //
  //   let zone: string | FixedOffsetZone;
  //   if (timezone.startsWith('UTC')) {
  //     const offsetMinutes = parseTimezoneOffset(timezone); // Implement this if needed
  //     zone = FixedOffsetZone.instance(offsetMinutes);
  //   } else {
  //     zone = timezone;
  //   }
  //
  //   // Convert dateRangeStart and End to user's local zone
  //   const userStart = DateTime.fromISO(dateRangeStart, { zone: 'utc' }).setZone(
  //     zone,
  //   );
  //   const userEnd = DateTime.fromISO(dateRangeEnd, { zone: 'utc' }).setZone(
  //     zone,
  //   );
  //
  //   if (!userStart.isValid || !userEnd.isValid) {
  //     throw new NotAcceptableException(
  //       `Invalid date range: start=${dateRangeStart}, end=${dateRangeEnd}`,
  //     );
  //   }
  //
  //   // Normalize the start based on range
  //   let startLocal = userStart;
  //   if (range === 'weekly') {
  //     startLocal = userStart.startOf('week');
  //   } else if (range === 'monthly') {
  //     startLocal = userStart.startOf('month');
  //   } else {
  //     startLocal = userStart.startOf('day');
  //   }
  //
  //   const endLocal =
  //     range === 'weekly'
  //       ? userEnd.endOf('week')
  //       : range === 'monthly'
  //         ? userEnd.endOf('month')
  //         : userEnd.endOf('day');
  //
  //   // Convert to UTC for querying the DB
  //   const startUTC = startLocal.toUTC().toJSDate();
  //   const endUTC = endLocal.toUTC().toJSDate();
  //
  //   const pgRange = {
  //     daily: 'day',
  //     weekly: 'week',
  //     monthly: 'month',
  //   }[range];
  //
  //   const rawResults = await this.entityManager
  //     .createQueryBuilder(EventView, 'views')
  //     .select(`DATE_TRUNC('${pgRange}', views.createdAt)`, 'timeGroup')
  //     .addSelect('COUNT(views.id)', 'viewCount')
  //     .where('views.eventId = :eventId', { eventId })
  //     .andWhere('views.createdAt BETWEEN :start AND :end', {
  //       start: startUTC,
  //       end: endUTC,
  //     })
  //     .groupBy(`DATE_TRUNC('${pgRange}', views.createdAt)`)
  //     .orderBy(`DATE_TRUNC('${pgRange}', views.createdAt)`, 'ASC')
  //     .getRawMany();
  //
  //   // Create full range of expected time groups in user's local time
  //   const fullRange: string[] = [];
  //   let current = startLocal;
  //
  //   while (current <= endLocal) {
  //     fullRange.push(current.toUTC().toISO());
  //
  //     if (range === 'daily') {
  //       current = current.plus({ days: 1 });
  //     } else if (range === 'weekly') {
  //       current = current.plus({ weeks: 1 });
  //     } else {
  //       current = current.plus({ months: 1 });
  //     }
  //   }
  //
  //   const resultMap = new Map(
  //     rawResults.map(({ timeGroup, viewCount }) => [
  //       DateTime.fromJSDate(timeGroup).toUTC().toISO(),
  //       parseInt(viewCount, 10),
  //     ]),
  //   );
  //
  //   const formattedResults: Record<string, number> = {};
  //
  //   fullRange.forEach((iso) => {
  //     const dt = DateTime.fromISO(iso, { zone });
  //
  //     if (range === 'daily') {
  //       const label = dt.toFormat('MMM d');
  //       formattedResults[label] = resultMap.get(iso) || 0;
  //     } else if (range === 'weekly') {
  //       const weekStart = dt;
  //       const weekEnd = dt.plus({ days: 6 });
  //       const label = `${weekStart.toFormat('MMM d')} - ${weekEnd.toFormat('MMM d')}`;
  //       formattedResults[label] = resultMap.get(iso) || 0;
  //     } else if (range === 'monthly') {
  //       const label = dt.toFormat('MMM');
  //       formattedResults[label] = resultMap.get(iso) || 0;
  //     }
  //   });
  //
  //   return formattedResults;
  // }

  private async _getEventPageViews(
    eventId: string,
    dateRangeStart: string,
    dateRangeEnd: string,
    range: 'daily' | 'weekly' | 'monthly',
    timezone: string = 'sdsd',
  ) {
    const startOfDay = new Date(dateRangeStart);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(dateRangeEnd);
    endOfDay.setHours(23, 59, 59, 999);

    // Map the `range` input to PostgreSQL-compatible units
    const rangeMapping = {
      daily: 'day',
      weekly: 'week',
      monthly: 'month',
    };

    const pgRange = rangeMapping[range]; // Resolve PostgreSQL-compatible unit

    // Adjust start and end dates for weekly and monthly
    if (range === 'weekly') {
      const dayOfWeek = startOfDay.getDay(); // Get the current day of the week (0 = Sunday)
      startOfDay.setDate(startOfDay.getDate() - dayOfWeek + 1); // Align to the start of the week (Monday)
    } else if (range === 'monthly') {
      startOfDay.setDate(1); // Align to the first day of the month
    }

    // Generate the query
    const queryBuilder = this.entityManager
      .createQueryBuilder(EventView, 'views')
      .select(`DATE_TRUNC('${pgRange}', views.createdAt)`, 'timeGroup')
      .addSelect('COUNT(views.id)', 'viewCount')
      .where('views.eventId = :eventId', { eventId })
      .andWhere('views.createdAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .groupBy(`DATE_TRUNC('${pgRange}', views.createdAt)`)
      .orderBy(`DATE_TRUNC('${pgRange}', views.createdAt)`, 'ASC');

    const rawResults = await queryBuilder.getRawMany();

    // Generate a full range of periods
    const fullRange: string[] = [];
    const currentDate = new Date(startOfDay);

    while (currentDate <= endOfDay) {
      fullRange.push(currentDate.toISOString());

      if (range === 'daily') {
        currentDate.setDate(currentDate.getDate() + 1); // Increment by 1 day
      } else if (range === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7); // Increment by 7 days
      } else if (range === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1); // Increment by 1 month
      }
    }

    // Map raw results to a dictionary for quick lookups
    const resultMap = new Map(
      rawResults.map(({ timeGroup, viewCount }) => [
        new Date(timeGroup).toISOString(),
        parseInt(viewCount, 10),
      ]),
    );

    // Format response based on range
    const formattedResults: Record<string, number> = {};

    fullRange.forEach((period) => {
      const date = new Date(period);

      if (range === 'daily') {
        const dayLabel = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        formattedResults[dayLabel] = resultMap.get(period) || 0;
      } else if (range === 'weekly') {
        const weekStart = new Date(date);
        const weekEnd = new Date(date);
        weekEnd.setDate(weekEnd.getDate() + 6); // Add 6 days for a full week

        const weekLabel = `${weekStart.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        formattedResults[weekLabel] = resultMap.get(period) || 0;
      } else if (range === 'monthly') {
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
        formattedResults[monthLabel] = resultMap.get(period) || 0;
      }
    });

    return formattedResults;
  }
}
