import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  BookingStatus,
  TicketTransferStatus,
} from '@app/rest/attendee/bookings/enums/booking-status';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { EventView } from '@app/rest/attendee/dashboard/entities/event-view.entity';
import { LineItem } from '@app/rest/organizer/event-resources/line-items/entities/line-item.entity';

@Injectable()
export class EventAnalyticsService {
  constructor(
    private readonly entityManager: EntityManager,
    private readonly configService: ConfigService,
  ) {}

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
    const { dateRangeStart, dateRangeEnd, range } = query;
    let pageViews = {};
    if (dateRangeStart && dateRangeEnd && range) {
      pageViews = await this._getEventPageViews(
        eventId,
        dateRangeStart,
        dateRangeEnd,
        range,
      );
    }

    return {
      grossRevenue: await this._getGrossRevenueAnalytics(event),
      netRevenue: await this._getNetRevenueAnalytics(event),
      ticketsSold: await this._getTicketsSoldAnalytics(event),
      ticketsScanned: await this._getScannedTicketsAnalytics(event),
      attendanceRate: await this._getAttendanceRate(event),
      pageViews,
    };
  }

  private async _getAttendanceRate(event: Event) {
    const { id, totalNumberOfTicketsSold } = event;

    // fetch ticket scanned
    const ticketsScanned = await this.entityManager
      .createQueryBuilder(Booking, 'bookings')
      .where('bookings.eventId = :eventId', { eventId: id })
      .andWhere('bookings.transfer_status != :transferStatus', {
        transferStatus: TicketTransferStatus.TRANSFERRED,
      })
      .andWhere('bookings.status = :status', { status: BookingStatus.USED })
      .getCount();

    // calculate Attendance rate
    const attendanceRate = (ticketsScanned / totalNumberOfTicketsSold) * 100;

    // calculate percentage change
    const percentageChange = (attendanceRate * totalNumberOfTicketsSold) / 100;

    return {
      value: Math.ceil(attendanceRate * 100) / 100,
      change: Math.ceil(percentageChange * 100) / 100,
    };
  }

  private async _getTicketsSoldAnalytics(event: Event) {
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
      .getCount();

    const successfulBookingsToday = await this.entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.id = :eventId', { eventId: event.id })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :today', { today })
      .select(['bookings.id', 'bookings.unitAmount'])
      .getCount();

    return {
      value: event.totalNumberOfTicketsSold,
      change: this._percentageChange(
        successfulBookingsToday,
        successfulBookingsYesterday,
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

    // fetch all event line items
    const eventLineItems = await this.entityManager
      .createQueryBuilder(LineItem, 'lineItems')
      .where('lineItems.eventId = :eventId', { eventId: event.id })
      .getMany();

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

    const totalExpenses = eventLineItems.reduce(
      (acc, lineItem) => acc + +lineItem.amountSpent,
      0,
    );

    return {
      value: +event.revenue - totalExpenses,
      change: this._percentageChange(
        netRevenueTillToday - totalExpenses,
        netRevenueTillYesterday - totalExpenses,
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
      .andWhere('bookings.transfer_status != :transferStatus', {
        transferStatus: TicketTransferStatus.TRANSFERRED,
      })
      .andWhere('bookings.status = :status', { status: BookingStatus.USED })
      .getCount();

    const ticketsScannedToday = await this.entityManager
      .createQueryBuilder(Booking, 'bookings')
      .where('bookings.eventId = :eventId', { eventId: event.id })
      .andWhere('bookings.transfer_status != :transferStatus', {
        transferStatus: TicketTransferStatus.TRANSFERRED,
      })
      .andWhere('bookings.createdAt >= :today', { today })
      .andWhere('bookings.status = :status', { status: BookingStatus.USED })
      .getCount();

    const ticketsScannedYesterday = await this.entityManager
      .createQueryBuilder(Booking, 'bookings')
      .where('bookings.eventId = :eventId', { eventId: event.id })
      .andWhere('bookings.transfer_status != :transferStatus', {
        transferStatus: TicketTransferStatus.TRANSFERRED,
      })
      .andWhere('bookings.createdAt >= :yesterday', { yesterday })
      .andWhere('bookings.createdAt < :today', { today })
      .andWhere('bookings.status = :status', { status: BookingStatus.USED })
      .getCount();

    return {
      value: ticketsScanned,
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

    console.log(
      `------------------------grossRevenueYesterday: ${grossRevenueYesterday}, ------- grossRevenueToday: ${grossRevenueToday}`
    );

    return {
      value: +event.revenue,
      change: this._percentageChange(grossRevenueToday, grossRevenueYesterday),
    };
  }

  private _roundToTwo(digits: number) {
    return Math.ceil(digits * 100) / 100;
  }

  _percentageChange(today: number, yesterday: number) {
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
