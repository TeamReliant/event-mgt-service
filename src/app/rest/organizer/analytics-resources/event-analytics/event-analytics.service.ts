import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '@app/rest/users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import {
  BookingStatus,
  TicketTransferStatus,
} from '@app/rest/attendee/bookings/enums/booking-status';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { EventView } from '@app/rest/attendee/dashboard/entities/event-view.entity';

@Injectable()
export class EventAnalyticsService {
  constructor(
    private readonly entityManager: EntityManager,
    private readonly configService: ConfigService,
  ) {}

  async getAnalytics(userId: string, eventId: string, { ...query }) {
    // find the user with the given userId
    const event = await this.entityManager
      .createQueryBuilder(Event, 'event')
      .where('event.id = :eventId', { eventId })
      .andWhere('event.userId = :userId', { userId })
      .getOne();

    const { revenue, totalNumberOfTicketsSold } = event;

    // calculate the percentage left
    const organizerPercentage =
      (100 - +this.configService.get<number>('TICKET_PERCENTAGE_CUT')) / 100;
    // calculate the gross revenue
    const grossRevenue = revenue / organizerPercentage;

    // fetch ticket scanned
    const ticketsScanned = await this.entityManager
      .createQueryBuilder(Booking, 'bookings')
      .where('bookings.eventId = :eventId', { eventId })
      // .andWhere('bookings.transfer_status != :transferStatus', {
      //   transferStatus: TicketTransferStatus.TRANSFERRED,
      // })
      .andWhere('bookings.status = :status', { status: BookingStatus.USED })
      .getCount();

    // calculate Attendance rate
    const attendanceRate = (ticketsScanned / totalNumberOfTicketsSold) * 100;

    // calculate percentage change
    const percentageChange = (attendanceRate * totalNumberOfTicketsSold) / 100;

    // check if the neccessary queries for page views are supplied
    const { dateRangeStart, dateRangeEnd, range } = query;
    let pageViews = {};
    if (dateRangeStart && dateRangeEnd && range) {
      pageViews = await this.getEventPageViews(
        eventId,
        dateRangeStart,
        dateRangeEnd,
        range,
      );
    }

    return {
      grossRevenue,
      netRevenue: revenue,
      ticketsSold: totalNumberOfTicketsSold,
      ticketsScanned,
      attendanceRate: {
        value: Math.ceil(attendanceRate * 100) / 100,
        change: Math.ceil(percentageChange * 100) / 100,
      },
      pageViews,
    };
  }

  async getEventPageViews(
    eventId: string,
    dateRangeStart: string,
    dateRangeEnd: string,
    range: 'daily' | 'weekly' | 'monthly',
  ) {
    const startOfDay = new Date(dateRangeStart);
    startOfDay.setHours(1, 0, 0, 0);

    const endOfDay = new Date(dateRangeEnd);
    endOfDay.setHours(24, 59, 59, 999);

    // Map the `range` input to PostgreSQL-compatible units
    const rangeMapping = {
      daily: 'day',
      weekly: 'week',
      monthly: 'month',
    };

    const pgRange = rangeMapping[range]; // Resolve PostgreSQL-compatible unit

    // fetch event views
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

    // Format response based on range
    const formattedResults: Record<string, number> = {};

    rawResults.forEach(({ timeGroup, viewCount }) => {
      const date = new Date(timeGroup);

      if (range === 'daily') {
        const dayLabel = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        formattedResults[dayLabel] = parseInt(viewCount, 10);
      } else if (range === 'weekly') {
        const weekStart = new Date(date);
        const weekEnd = new Date(date);
        weekEnd.setDate(weekEnd.getDate() + 6); // Add 6 days for a full week

        const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        formattedResults[weekLabel] = parseInt(viewCount, 10);
      } else if (range === 'monthly') {
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
        formattedResults[monthLabel] = parseInt(viewCount, 10);
      }
    });

    return formattedResults;
    // const rawResults = await queryBuilder.getRawMany();
    //
    // // weekly
    // const week = {
    //   'Nov 14 - Nov 21': 34,
    //   'Nov 21 - Nov 28': 45,
    //   'Nov 28 - Dec 5': 23,
    //   'Dec 5 - Dec 12': 56,
    //   'Dec 12 - Dec 19': 23,
    //   'Dec 19 - Dec 26': 34,
    //   'Dec 26 - Jan 2': 45,
    //   // ETC
    // };
    //
    // const daily = {
    //   'Nov 1': 23,
    //   'Nov 2': 45,
    //   'Nov 3': 34,
    //   'Nov 4': 56,
    //   'Nov 5': 23,
    //   'Nov 6': 45,
    //   'Nov 7': 34,
    //   // ETC
    // };
    //
    // const monthly = {
    //   Nov: 23,
    //   Dec: 45,
    //   Jan: 34,
    //   Feb: 56,
    //   Mar: 23,
    //   Apr: 45,
    //   May: 34,
    //   // ETC
    // };
    //
    // return {
    //   Jan: 0,
    //   feb: 0,
    //   mar: 0,
    //   apr: 0,
    //   may: 0,
    //   jun: 0,
    //   jul: 0,
    //   aug: 0,
    //   sep: 0,
    //   oct: 0,
    //   nov: 0,
    //   dec: 0,
    // };
  }
}
