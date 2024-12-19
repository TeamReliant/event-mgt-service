import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '@app/rest/users/entities/user.entity';
import { UserType } from '@app/rest/users/enums/user-type';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import {
  BookingStatus,
  TicketTransferStatus,
} from '@app/rest/attendee/bookings/enums/booking-status';
import { BookingsTransaction } from '@app/rest/attendee/bookings-transactions/entities/bookings-transaction.entity';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly _entityManager: EntityManager) {}

  async getActiveUserChart(range: 'daily' | 'weekly' | 'monthly' = 'monthly') {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of the current day

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0); // Start of the day 30 days ago

    // Map the `range` input to PostgreSQL-compatible units
    const rangeMapping = {
      daily: 'day',
      weekly: 'week',
      monthly: 'month',
    };

    const pgRange = rangeMapping[range];

    // Generate the query
    const queryBuilder = this._entityManager
      .createQueryBuilder(User, 'users')
      .select(`DATE_TRUNC('${pgRange}', users.lastLoggedIn)`, 'timeGroup')
      .addSelect('COUNT(users.id)', 'activeUsersCount')
      .where('users.last_logged_in >= :thirtyDaysAgo', { thirtyDaysAgo })
      .andWhere('users.user_type != userType', { userType: UserType.ADMIN })
      .groupBy(`DATE_TRUNC('${pgRange}', users.last_logged_in)`)
      .orderBy(`DATE_TRUNC('${pgRange}', users.last_logged_in)`, 'ASC');

    const rawResults = await queryBuilder.getRawMany();

    // Generate the full range of periods for the past 30 days
    const fullRange: string[] = [];
    const currentDate = new Date(thirtyDaysAgo);

    while (currentDate <= today) {
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
      rawResults.map(({ timeGroup, activeUsersCount }) => [
        new Date(timeGroup).toISOString(),
        parseInt(activeUsersCount, 10),
      ]),
    );

    // Format the results based on the range
    const formattedResults: Record<string, number> = {};

    fullRange.forEach((period) => {
      const date = new Date(period);

      if (range === 'daily') {
        const dayLabel = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        formattedResults[dayLabel] = (resultMap.get(period) as number) || 0;
      } else if (range === 'weekly') {
        const weekStart = new Date(date);
        const weekEnd = new Date(date);
        weekEnd.setDate(weekEnd.getDate() + 6); // Add 6 days for a full week

        const weekLabel = `${weekStart.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        formattedResults[weekLabel] = (resultMap.get(period) as number) || 0;
      } else if (range === 'monthly') {
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
        formattedResults[monthLabel] = (resultMap.get(period) as number) || 0;
      }
    });

    return formattedResults;
  }

  async getAnalytics() {
    // count all users
    const usersCount = await this._entityManager
      .getRepository(User)
      .createQueryBuilder('users')
      .where('users.user_type != :userType', { userType: UserType.ADMIN })
      .getCount();

    // count all events
    const eventsCount = await this._entityManager
      .getRepository(Event)
      .createQueryBuilder('events')
      .getCount();

    // count all tickets
    const soldTicketsCount = await this._entityManager
      .getRepository(Booking)
      .createQueryBuilder('bookings')
      .where('bookings.transfer_status != :transferStatus', {
        transferStatus: TicketTransferStatus.TRANSFERRED,
      })
      .andWhere('bookings.processed = :processStatus', { processStatus: true })
      .getCount();

    // count scanned bookings
    const scannedTicketsCount = await this._entityManager
      .getRepository(Booking)
      .createQueryBuilder('bookings')
      .where('bookings.transfer_status = :transferStatus', {
        transferStatus: TicketTransferStatus.TRANSFERRED,
      })
      .andWhere('bookings.status = :bookingStatus', {
        bookingStatus: BookingStatus.USED,
      })
      .getCount();

    // count successful booking for the current month
    const currentMonth = new Date().getMonth() + 1;
    // Get the current month (1-12)
    const currentYear = new Date().getFullYear();
    const currentMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth, 0);
    const transactions = await this._entityManager
      .getRepository(BookingsTransaction)
      .createQueryBuilder('transactions')
      // .where('bookings.transfer_status != :transferStatus', { transferStatus: TicketTransferStatus.TRANSFERRED })
      // .andWhere('bookings.status = :bookingStatus', { bookingStatus: BookingStatus.USED })
      .andWhere('transactions.created_at >= :startOfMonth', {
        startOfMonth: currentMonthStart,
      })
      .andWhere('transactions.created_at <= :endOfMonth', {
        endOfMonth: currentMonthEnd,
      })
      .select(['transactions.id', 'bookings.fee'])
      .getMany();

    const revenue = transactions.reduce((acc, transaction) => {
      return acc + transaction.fee;
    }, 0);

    return {
      accountCreated: usersCount,
      totalEventCreated: eventsCount,
      TotalTicketSold: soldTicketsCount,
      ScannedTicket: scannedTicketsCount,
      monthlyRevenue: revenue, // for the current month
      totalRevenue: 0,

      conversionRate: 0,
      task: 0,
      budgeting: 0,
      guest: 0,
    };
  }
}
