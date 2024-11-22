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
    // get the date of 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(1, 0, 0, 0);

    // get the current date
    const today = new Date();
    today.setHours(24, 59, 59, 999);

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

    const ticketsScannedWithin7Days = await this.entityManager
      .createQueryBuilder(Booking, 'bookings')
      .where('bookings.eventId = :eventId', { eventId })
      // .andWhere('bookings.transfer_status != :transferStatus', {
      //   transferStatus: TicketTransferStatus.TRANSFERRED,
      // })
      .andWhere('bookings.createdAt >= :sevenDaysAgo', { sevenDaysAgo })
      .andWhere('bookings.createdAt <= :today', { today })
      .andWhere('bookings.status = :status', { status: BookingStatus.USED })
      .getCount();

    // fetch successful bookings within the last 7 days
    const successfulBookingsWithin7Days = await this.entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.userId = :userId', { userId })
      .andWhere('event.id = :eventId', { eventId })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :sevenDaysAgo', { sevenDaysAgo })
      .andWhere('bookings.createdAt <= :today', { today })
      .select(['bookings.id', 'bookings.unitAmount'])
      .getMany();

    // calculate Attendance rate
    const attendanceRate = (ticketsScanned / totalNumberOfTicketsSold) * 100;

    // calculate percentage change
    const percentageChange = (attendanceRate * totalNumberOfTicketsSold) / 100;

    // sum the unitAmount of the booking
    const totalNetRevenueWithin7Days = successfulBookingsWithin7Days.reduce(
      (acc, booking) => acc + +booking.unitAmount,
      0,
    );

    const grossRevenueWithin7days =
      totalNetRevenueWithin7Days / organizerPercentage;

    // calculate the revenue percentage change
    const percentageNetRevenueChangeWithin7Days =
      (totalNetRevenueWithin7Days / revenue) * 100;

    // calculate gross revenue percentage change
    const percentageGrossRevenueChangeWithin7Days =
      (grossRevenueWithin7days / grossRevenue) * 100;

    // calculate ticket scanned percentage change
    const ticketScannedPercentageChange =
      (ticketsScannedWithin7Days / ticketsScanned) * 100;

    // calculate tickets sold percentage change
    const percentageChangeTicketsSoldWithin7Days =
      (successfulBookingsWithin7Days.length / totalNumberOfTicketsSold) * 100;

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
      grossRevenue: {
        value: grossRevenue,
        change: this._roundToTwo(percentageGrossRevenueChangeWithin7Days),
      },
      netRevenue: {
        value: revenue,
        change: this._roundToTwo(percentageNetRevenueChangeWithin7Days),
      },
      ticketsSold: {
        value: totalNumberOfTicketsSold,
        change: this._roundToTwo(percentageChangeTicketsSoldWithin7Days),
      },
      ticketsScanned: {
        value: ticketsScanned,
        change: this._roundToTwo(ticketScannedPercentageChange),
      },
      attendanceRate: {
        value: Math.ceil(attendanceRate * 100) / 100,
        change: Math.ceil(percentageChange * 100) / 100,
      },
      pageViews,
    };
  }

  private _roundToTwo(digits: number) {
    return Math.ceil(digits * 100) / 100;
  }

  async getEventPageViews(
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

    // Generate a full range of periods
    const fullRange: string[] = [];
    const currentDate = new Date(startOfDay);

    while (currentDate <= endOfDay) {
      if (range === 'daily') {
        fullRange.push(currentDate.toISOString());
        currentDate.setDate(currentDate.getDate() + 1); // Increment by 1 day
      } else if (range === 'weekly') {
        fullRange.push(currentDate.toISOString());
        currentDate.setDate(currentDate.getDate() + 7); // Increment by 7 days
      } else if (range === 'monthly') {
        fullRange.push(currentDate.toISOString());
        currentDate.setMonth(currentDate.getMonth() + 1); // Increment by 1 month
      }
    }

    // Format response based on range
    const formattedResults: Record<string, number> = {};

    const resultMap = new Map(
      rawResults.map(({ timeGroup, viewCount }) => [
        new Date(timeGroup).toISOString(),
        parseInt(viewCount, 10),
      ]),
    );

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


  // async getEventPageViews(
  //   eventId: string,
  //   dateRangeStart: string,
  //   dateRangeEnd: string,
  //   range: 'daily' | 'weekly' | 'monthly',
  // ) {
  //   const startOfDay = new Date(dateRangeStart);
  //   startOfDay.setHours(1, 0, 0, 0);
  //
  //   const endOfDay = new Date(dateRangeEnd);
  //   endOfDay.setHours(24, 59, 59, 999);
  //
  //   // Map the `range` input to PostgreSQL-compatible units
  //   const rangeMapping = {
  //     daily: 'day',
  //     weekly: 'week',
  //     monthly: 'month',
  //   };
  //
  //   const pgRange = rangeMapping[range]; // Resolve PostgreSQL-compatible unit
  //
  //   // fetch event views
  //   const queryBuilder = this.entityManager
  //     .createQueryBuilder(EventView, 'views')
  //     .select(`DATE_TRUNC('${pgRange}', views.createdAt)`, 'timeGroup')
  //     .addSelect('COUNT(views.id)', 'viewCount')
  //     .where('views.eventId = :eventId', { eventId })
  //     .andWhere('views.createdAt BETWEEN :start AND :end', {
  //       start: startOfDay,
  //       end: endOfDay,
  //     })
  //     .groupBy(`DATE_TRUNC('${pgRange}', views.createdAt)`)
  //     .orderBy(`DATE_TRUNC('${pgRange}', views.createdAt)`, 'ASC');
  //
  //   const rawResults = await queryBuilder.getRawMany();
  //
  //   // Format response based on range
  //   const formattedResults: Record<string, number> = {};
  //
  //   rawResults.forEach(({ timeGroup, viewCount }) => {
  //     const date = new Date(timeGroup);
  //
  //     if (range === 'daily') {
  //       const dayLabel = date.toLocaleDateString('en-US', {
  //         month: 'short',
  //         day: 'numeric',
  //       });
  //       formattedResults[dayLabel] = parseInt(viewCount, 10);
  //     } else if (range === 'weekly') {
  //       const weekStart = new Date(date);
  //       const weekEnd = new Date(date);
  //       weekEnd.setDate(weekEnd.getDate() + 6); // Add 6 days for a full week
  //
  //       const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  //       formattedResults[weekLabel] = parseInt(viewCount, 10);
  //     } else if (range === 'monthly') {
  //       const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
  //       formattedResults[monthLabel] = parseInt(viewCount, 10);
  //     }
  //   });
  //
  //   return formattedResults;
  // }
}
