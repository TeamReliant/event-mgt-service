import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '@app/rest/users/entities/user.entity';
import { BookingsTransaction } from '@app/rest/attendee/bookings-transactions/entities/bookings-transaction.entity';
import { SystemRegister } from '@app/rest/admin/system-register/entities/system-register.entity';
import { Transaction } from '@app/rest/organizer/transaction-resources/transactions/entities/transaction.entity';
import { DateTime, DateTimeUnit } from 'luxon';
import {
  getOffsetSuffix,
  mapToIanaTimezone,
} from '@libs/helpers/char-generator';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly _entityManager: EntityManager) {}

  async getActiveUsersChart(
    dateRangeStart: Date,
    dateRangeEnd: Date,
    granularity: 'daily' | 'weekly' | 'monthly',
    timezone: string = 'UTC+01:00',
  ): Promise<Record<string, number>> {
    timezone = timezone.replace(/\s/g, '+').replace(':00', '');
    const ianaTimezone = mapToIanaTimezone(timezone);

    // Define the SQL interval and date truncation
    const interval = {
      daily: '1 day',
      weekly: '1 week',
      monthly: '1 month',
    };

    const rawResults = await this._entityManager.query(
      `
    WITH date_series AS (
      SELECT
          generate_series(
              $1::date,
              $2::date,
              INTERVAL '${interval[granularity]}'
          ) AS range_start
    )
    SELECT
        TO_CHAR(date_series.range_start,
                 CASE
                   WHEN '${granularity}' = 'daily' THEN 'YYYY-MM-DD'
                   WHEN '${granularity}' = 'weekly' THEN 'YYYY-MM-DD'
                   WHEN '${granularity}' = 'monthly' THEN 'YYYY-MM'
                   ELSE 'YYYY-MM-DD'
                 END) AS label_date,
        COALESCE(COUNT(users.id), 0) AS user_count
    FROM
        date_series
    LEFT JOIN users
        ON users.last_logged_in >= date_series.range_start
        AND users.last_logged_in < date_series.range_start + INTERVAL '${interval[granularity]}'
    GROUP BY
        date_series.range_start
    ORDER BY
        date_series.range_start;
    `,
      [dateRangeStart, dateRangeEnd],
    );

    // Process and format results
    return rawResults.reduce((acc, row) => {
      const { label_date, user_count } = row;
      let key = '';

      // Daily granularity
      if (granularity === 'daily') {
        const date = new Date(label_date);
        key = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
      }

      // Weekly granularity
      if (granularity === 'weekly') {
        const startOfWeek = new Date(label_date);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const startStr = `${startOfWeek.toLocaleString('default', { month: 'short' })} ${startOfWeek.getDate()}`;
        const endStr = `${endOfWeek.toLocaleString('default', { month: 'short' })} ${endOfWeek.getDate()}`;
        key = `${startStr} - ${endStr}`;
      }

      // Monthly granularity
      if (granularity === 'monthly') {
        const date = new Date(label_date);
        key = `${date.toLocaleString('default', { month: 'short' })}`;
      }

      acc[key] = user_count;
      return acc;
    }, {});
  }

  // async getActiveUsersChart(
  //   dateRangeStart: Date,
  //   dateRangeEnd: Date,
  //   granularity: 'daily' | 'weekly' | 'monthly',
  //   timezone: string = 'UTC+01:00',
  // ): Promise<Record<string, number>> {
  //   timezone = timezone.replace(/\s/g, '+').replace(':00', '');
  //   const ianaTimezone = mapToIanaTimezone(timezone);
  //
  //   const interval = {
  //     daily: '1 day',
  //     weekly: '1 week',
  //     monthly: '1 month',
  //   };
  //
  //   const rawResults = await this._entityManager.query(
  //     `
  // WITH date_series AS (
  //   SELECT
  //       generate_series(
  //           $1::date,
  //           $2::date,
  //           INTERVAL '${interval[granularity]}'
  //       ) AS range_start
  // )
  // SELECT
  //     TO_CHAR(date_series.range_start AT TIME ZONE $3,
  //              CASE
  //                WHEN '${granularity}' = 'daily' THEN 'YYYY-MM-DD'
  //                WHEN '${granularity}' = 'weekly' THEN 'YYYY-MM-DD'
  //                WHEN '${granularity}' = 'monthly' THEN 'YYYY-MM'
  //                ELSE 'YYYY-MM-DD'
  //              END) AS label_date,
  //     COALESCE(COUNT(users.id), 0) AS user_count
  // FROM
  //     date_series
  // LEFT JOIN users
  //     ON CAST(users.last_logged_in AT TIME ZONE $3 AS DATE) >= CAST($1::timestamp AT TIME ZONE $3 AS DATE)
  //     AND CAST(users.last_logged_in AT TIME ZONE $3 AS DATE) < CAST($2::timestamp AT TIME ZONE $3 + INTERVAL '1 day' AS DATE)
  //     AND users.last_logged_in >= date_series.range_start
  //     AND users.last_logged_in < date_series.range_start + INTERVAL '${interval[granularity]}'
  // GROUP BY
  //     date_series.range_start
  // ORDER BY
  //     date_series.range_start;
  // `,
  //     [dateRangeStart, dateRangeEnd, ianaTimezone],
  //   );
  //
  //   return rawResults.reduce((acc, row) => {
  //     const { label_date, user_count } = row;
  //     let key = '';
  //
  //     if (granularity === 'daily') {
  //       const date = DateTime.fromISO(label_date, { zone: ianaTimezone });
  //       key = `${date.toFormat('MMM')} ${date.toFormat('d')}`;
  //     } else if (granularity === 'weekly') {
  //       const startDate = DateTime.fromISO(label_date, {
  //         zone: ianaTimezone,
  //       }).startOf('week');
  //       const endDate = DateTime.fromISO(label_date, {
  //         zone: ianaTimezone,
  //       }).endOf('week');
  //       key = `${startDate.toFormat('MMM')} ${startDate.toFormat('d')} - ${endDate.toFormat('MMM')} ${endDate.toFormat('d')}`;
  //     } else if (granularity === 'monthly') {
  //       const date = DateTime.fromISO(label_date, { zone: ianaTimezone });
  //       key = `${date.toFormat('MMM')}`;
  //     }
  //
  //     acc[key] = user_count;
  //     return acc;
  //   }, {});
  // }

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
      .createQueryBuilder(BookingsTransaction, 'transactions')
      .where('transactions.created_at >= :startOfMonth', {
        startOfMonth: currentMonthStart,
      })
      .andWhere('transactions.created_at <= :endOfMonth', {
        endOfMonth: currentMonthEnd,
      })
      .andWhere('transactions.paid = :paid', { paid: true })
      .select(['transactions.id', 'transactions.fee'])
      .getMany();

    const bookingRevenue = currentMonthBookingTransactions.reduce(
      (acc, transaction) => {
        return acc + +transaction.fee;
      },
      0,
    );

    // get transactions for the current month
    const currentMonthTransactions = await this._entityManager
      .getRepository(Transaction)
      .createQueryBuilder('transactions')
      .leftJoinAndSelect('transactions.user', 'user')
      .where('transactions.created_at >= :startOfMonth', {
        startOfMonth: currentMonthStart,
      })
      .andWhere('transactions.created_at <= :endOfMonth', {
        endOfMonth: currentMonthEnd,
      })
      .andWhere('transactions.status = :status', { status: 'succeeded' })
      .andWhere('user.subscriptionStatus != :status', { status: 'trailing' })
      .select(['transactions.id', 'transactions.amount'])
      .getMany();

    const subscriptionRevenue = currentMonthTransactions.reduce(
      (acc, transaction) => {
        return acc + +transaction.amount;
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
      ticketsRsvp,
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
      TotalTicketRsvp: ticketsRsvp,
      ScannedTicket: scannedTickets,
      monthlyRevenue: this._roundDownToTwo(
        Number(bookingRevenue + subscriptionRevenue),
      ),
      totalRevenue: this._roundDownToTwo(totalRevenue),

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
    return this._roundDownToTwo(percentage);
  }

  private _roundDownToTwo(digits: number) {
    return Math.ceil(digits * 100) / 100;
  }
}
