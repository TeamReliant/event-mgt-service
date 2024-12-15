import { Injectable } from '@nestjs/common';
import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { User } from '@app/rest/users/entities/user.entity';
import { BookingStatus } from '@app/rest/attendee/bookings/enums/booking-status';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { EventStatus } from '@app/rest/organizer/event-resources/events/enums';

@Injectable()
export class OrganizerDashboardService {
  constructor(private readonly _entityManager: EntityManager) {}

  public async getAnalytics(userId: string) {
    // get the date of 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(1, 0, 0, 0);

    // get the current date
    const today = new Date();
    today.setHours(24, 59, 59, 999);

    // find the user with the userId
    const user = await this._entityManager.findOneBy(User, { id: userId });

    // Base query for current events, joining necessary relationships
    const queryBuilder = this._entityManager
      .createQueryBuilder(Event, 'events')
      .leftJoinAndSelect('events.tickets', 'tickets')
      .where('events.eventStatus = :status', { status: 'published' })
      .andWhere('events.userId = :userId', { userId });

    // Fetch current published events and total count
    const totalEvents = await queryBuilder.getCount();

    // Fetch the 5 most recent events
    const recentEvents = await this.getRecentEvents(queryBuilder);

    // count used tickets
    const usedBookingsCount = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.userId = :userId', { userId })
      .andWhere('bookings.status = :bookingStatus', {
        bookingStatus: BookingStatus.USED,
      })
      .getCount();

    // fetch successful bookings within the last 7 days
    const successfulBookingsWithin7Days = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.userId = :userId', { userId })
      .andWhere('bookings.status = :status', { status: BookingStatus.VALID })
      .andWhere('bookings.createdAt >= :sevenDaysAgo', { sevenDaysAgo })
      .andWhere('bookings.createdAt < :today', { today })
      .select(['bookings.id', 'bookings.unitAmount'])
      .getMany();

    // fetch event published within the last 7 days
    const eventsPublishedWithin7Days = await this._entityManager
      .createQueryBuilder(Event, 'events')
      .leftJoinAndSelect('events.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('events.eventStatus = :status', {
        status: EventStatus.PUBLISHED,
      })
      .andWhere('events.createdAt >= :sevenDaysAgo', { sevenDaysAgo })
      .andWhere('events.createdAt < :today', { today })
      .getCount();

    // fetch all events ever published by the user
    const totalEventsPublished = await this._entityManager
      .createQueryBuilder(Event, 'events')
      .leftJoinAndSelect('events.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('events.eventStatus = :status', {
        status: EventStatus.PUBLISHED,
      })
      .getCount();

    const allBookingCount = await this._entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.userId = :userId', { userId })
      .andWhere('bookings.processed = :status', { status: true })
      .getCount();

    const attendancePercentageChange =
      (usedBookingsCount / allBookingCount) * 100;

    // sum the unitAmount of the booking
    const totalRevenueWithin7Days = successfulBookingsWithin7Days.reduce(
      (acc, booking) => acc + +booking.unitAmount,
      0,
    );

    // calculate the revenue percentage change
    const percentageRevenueChangeWithin7Days =
      (totalRevenueWithin7Days / user.totalRevenue) * 100;

    // calculate the ticketsSold percentage change
    const percentageChangeTicketsSoldWithin7Days =
      (successfulBookingsWithin7Days.length / user.ticketsSold) * 100;

    // calculate the events percentage change
    const percentageChangeEventsWithin7Days =
      (eventsPublishedWithin7Days / totalEventsPublished) * 100;

    return {
      totalRevenue: {
        value: user.totalRevenue,
        change: this._roundToTwo(percentageRevenueChangeWithin7Days), // Placeholder for future calculation
      },
      ticketsSold: {
        value: user.ticketsSold,
        change: this._roundToTwo(percentageChangeTicketsSoldWithin7Days), // Placeholder for future calculation
      },
      publishedEvents: {
        value: totalEvents,
        change: this._roundToTwo(percentageChangeEventsWithin7Days), // Placeholder for future calculation
      },
      attendanceRate: {
        value: usedBookingsCount,
        change: this._roundToTwo(attendancePercentageChange), // Placeholder for future calculation
      },
      recentEvents,
      usefulResources: [
        {
          title: 'How to build a good audience and get fast results.',
          image:
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsTcK2i0b4xIMSuFgz322U9xH-wKcuX0Jz-A&s',
        },
        {
          title: 'How to build a good audience and get fast results.',
          image:
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsTcK2i0b4xIMSuFgz322U9xH-wKcuX0Jz-A&s',
        },
      ],
    };
  }

  private _roundToTwo(digits: number) {
    return Math.ceil(digits * 100) / 100;
  }

  // Helper to fetch past analytics (e.g., for the last month)
  // private async getPastAnalytics(userId: string) {
  //   const pastQueryBuilder = this.entityManager
  //     .createQueryBuilder(Event, 'events')
  //     .leftJoinAndSelect('events.tickets', 'tickets')
  //     .where('events.eventStatus = :status', { status: 'published' })
  //     .andWhere('events.userId = :userId', { userId });
  //
  //   // Get yesterday's date
  //   const yesterday = new Date();
  //   yesterday.setDate(yesterday.getDate() - 1);
  //
  //   // Get two days ago
  //   const twoDaysAgo = new Date();
  //   twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  //
  //   const formattedYesterday = yesterday.toISOString().split('T')[0];
  //   const formattedTwoDaysAgo = twoDaysAgo.toISOString().split('T')[0];
  //
  //   const start = new Date(formattedTwoDaysAgo);
  //   start.setHours(1, 0, 0, 0);
  //
  //   const end = new Date(formattedYesterday);
  //   end.setHours(24, 59, 59, 999);
  //
  //   pastQueryBuilder.andWhere('events.createdAt BETWEEN :start AND :end', {
  //     start,
  //     end,
  //   });
  //
  //   const pastEvents = await pastQueryBuilder.getMany();
  //
  //   const { totalTicketSold, totalRevenue } =
  //     this.calculateEventMetrics(pastEvents);
  //
  //   return {
  //     totalTicketSold,
  //     totalRevenue,
  //     totalEvents: pastEvents.length,
  //   };
  // }
  //
  // // Helper to calculate percentage increase/decrease
  // private calculatePercentageChange(
  //   currentMetrics: {
  //     totalTicketSold: number;
  //     totalRevenue: number;
  //     totalEvents: number;
  //   },
  //   pastMetrics: {
  //     totalTicketSold: number;
  //     totalRevenue: number;
  //     totalEvents: number;
  //   },
  // ) {
  //   return {
  //     totalTicketSoldChange: this.getPercentageChange(
  //       currentMetrics.totalTicketSold,
  //       pastMetrics.totalTicketSold,
  //     ),
  //     totalRevenueChange: this.getPercentageChange(
  //       currentMetrics.totalRevenue,
  //       pastMetrics.totalRevenue,
  //     ),
  //     totalEventsChange: this.getPercentageChange(
  //       currentMetrics.totalEvents,
  //       pastMetrics.totalEvents,
  //     ),
  //   };
  // }
  //
  // // Helper to calculate percentage change between two numbers
  // private getPercentageChange(current: number, past: number): number {
  //   if (past === 0) {
  //     return current === 0 ? 0 : 100; // If there's no past data, return 100% if there's current data
  //   }
  //   return ((current - past) / past) * 100;
  // }
  //
  // // Helper to calculate metrics such as total tickets sold and revenue
  // private calculateEventMetrics(events: Event[]): {
  //   totalTicketSold: number;
  //   totalRevenue: number;
  // } {
  //   return events.reduce(
  //     (acc, event) => {
  //       event.tickets?.forEach((ticket) => {
  //         acc.totalTicketSold += ticket.numberOfTicketsSold;
  //         acc.totalRevenue += ticket.price * ticket.numberOfTicketsSold;
  //       });
  //       return acc;
  //     },
  //     { totalTicketSold: 0, totalRevenue: 0 },
  //   );
  // }

  // Helper to fetch the most recent 5 events
  private async getRecentEvents(
    queryBuilder: SelectQueryBuilder<Event>,
  ): Promise<Event[]> {
    const recentEvents = await queryBuilder
      .clone() // Clone the query to avoid modifying the base query
      .orderBy('events.createdAt', 'DESC')
      .limit(5)
      .getMany();

    // Remove unnecessary relations from recent events to reduce payload size
    return recentEvents.map((event) => {
      delete event.user;
      delete event.team;
      delete event.tickets;
      return event;
    });
  }
}
