import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '@app/rest/users/entities/user.entity';
import { BookingsTransaction } from '@app/rest/attendee/bookings-transactions/entities/bookings-transaction.entity';
import { SystemRegister } from '@app/rest/admin/system-register/entities/system-register.entity';
import { Transaction } from '@app/rest/organizer/transaction-resources/transactions/entities/transaction.entity';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly _entityManager: EntityManager) {}

  async getActiveUsersChart(
    dateRangeStart: string,
    dateRangeEnd: string,
    range: 'daily' | 'weekly' | 'monthly' = 'monthly',
  ) {
    // Convert date range to Date objects
    const startDate = new Date(dateRangeStart);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(dateRangeEnd);
    endDate.setHours(23, 59, 59, 999); // Ensure we include the full end day

    // Map `range` input to PostgreSQL-compatible units
    const rangeMapping = {
      daily: 'day',
      weekly: 'week',
      monthly: 'month',
    };

    const pgRange = rangeMapping[range]; // PostgreSQL-compatible unit

    // Fetch active users within the date range
    const queryBuilder = this._entityManager
      .createQueryBuilder(User, 'user')
      .select(`DATE_TRUNC('${pgRange}', user.last_logged_in)`, 'timeGroup')
      .addSelect('COUNT(user.id)', 'activeCount')
      .where('user.last_logged_in BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('user.last_logged_in >= :thirtyDaysAgo', {
        thirtyDaysAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      })
      .groupBy(`DATE_TRUNC('${pgRange}', user.last_logged_in)`)
      .orderBy(`DATE_TRUNC('${pgRange}', user.last_logged_in)`, 'ASC');

    const rawResults = await queryBuilder.getRawMany();

    // Create a Map to hold the active user counts
    const resultMap = new Map<string, number>();

    rawResults.forEach(({ timeGroup, activeCount }) => {
      resultMap.set(timeGroup, parseInt(activeCount, 10));
    });

    // Generate the date labels and populate the results
    const formattedResults: Record<string, number> = {};

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      let label: string;
      const period = new Date(currentDate).toISOString(); // Used as the Map key

      if (range === 'daily') {
        label = currentDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        formattedResults[label] = resultMap.get(period) ?? 0;

        currentDate.setDate(currentDate.getDate() + 1); // Increment by 1 day
      } else if (range === 'weekly') {
        const weekStart = new Date(currentDate);
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(weekEnd.getDate() + 6); // Add 6 days for the week

        label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        formattedResults[label] = resultMap.get(period) ?? 0;

        currentDate.setDate(currentDate.getDate() + 7); // Increment by 7 days
      } else if (range === 'monthly') {
        label = currentDate.toLocaleDateString('en-US', { month: 'short' });
        formattedResults[label] = resultMap.get(period) ?? 0;

        currentDate.setMonth(currentDate.getMonth() + 1); // Increment by 1 month
      }
    }

    return formattedResults;
  }

  async getAnalytics() {
    // fetch the system register
    const systemRegister = await this._entityManager
      .createQueryBuilder(SystemRegister, 'system')
      .getOne();

    // get successful booking for the current month
    const currentMonth = new Date().getMonth() + 1;
    // Get the current month (1-12)
    const currentYear = new Date().getFullYear();
    const currentMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth, 0);
    const currentMonthBookingTransactions = await this._entityManager
      .getRepository(BookingsTransaction)
      .createQueryBuilder('transactions')
      .andWhere('transactions.created_at >= :startOfMonth', {
        startOfMonth: currentMonthStart,
      })
      .andWhere('transactions.created_at <= :endOfMonth', {
        endOfMonth: currentMonthEnd,
      })
      .select(['transactions.id', 'bookings.fee'])
      .getMany();

    const bookingRevenue = currentMonthBookingTransactions.reduce(
      (acc, transaction) => {
        return acc + transaction.fee;
      },
      0,
    );

    // get transactions for the current month
    const currentMonthTransactions = await this._entityManager
      .getRepository(Transaction)
      .createQueryBuilder('transactions')
      .andWhere('transactions.created_at >= :startOfMonth', {
        startOfMonth: currentMonthStart,
      })
      .andWhere('transactions.created_at <= :endOfMonth', {
        endOfMonth: currentMonthEnd,
      })
      .select(['transactions.id', 'bookings.fee'])
      .getMany();

    const subscriptionRevenue = currentMonthTransactions.reduce(
      (acc, transaction) => {
        return acc + transaction.amount;
      },
      0,
    );

    // count users with tasks
    const usersWithTask = await this._entityManager
      .createQueryBuilder(User, 'user')
      .leftJoin('user.teamMembers', 'teamMember')
      .leftJoin('teamMember.tasks', 'tasks')
      .where('tasks.id IS NOT NULL') // Only include users with at least one task
      .getCount();

    // count users with line items
    const usersWithLineItem = await this._entityManager
      .createQueryBuilder(User, 'user')
      .leftJoin('user.events', 'events')
      .leftJoin('events.lineItems', 'lineItems')
      .where('lineItems.id IS NOT NULL') // Only include users with at least one line item
      .getCount();

    const {
      accountsCreated,
      totalRevenue,
      totalEvents,
      ticketsSold,
      scannedTickets,
      verifiedAccounts,
      totalAttendees,
      totalOrganizers,
      totalSubscribedOrganizers,
    } = systemRegister;

    return {
      accountCreated: accountsCreated,
      totalEventCreated: totalEvents,
      TotalTicketSold: ticketsSold,
      ScannedTicket: scannedTickets,
      monthlyRevenue: bookingRevenue + subscriptionRevenue,
      totalRevenue: totalRevenue,

      conversionRate: this._calculateRate(
        totalOrganizers,
        totalSubscribedOrganizers,
      ),
      task: this._calculateRate(verifiedAccounts, usersWithTask),
      budgeting: this._calculateRate(verifiedAccounts, usersWithLineItem),
      guest: this._calculateRate(accountsCreated, totalAttendees),
    };
  }

  private _calculateRate(whole: number, part: number) {
    // check if accounts created is 0
    if (whole === 0) return 0;

    // check if verified accounts is 0
    if (part === 0) return 0;

    const percentage = (part / whole) * 100;
    return percentage.toFixed(2); // Rounds to 2 decimal places
  }
}
