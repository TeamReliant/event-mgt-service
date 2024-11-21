import { Injectable } from '@nestjs/common';
import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { User } from '@app/rest/users/entities/user.entity';
import { BookingStatus } from '@app/rest/attendee/bookings/enums/booking-status';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';

@Injectable()
export class OrganizerDashboardService {
  constructor(private readonly entityManager: EntityManager) {}

  public async getAnalytics(userId: string) {
    // find the user with the userId
    const user = await this.entityManager.findOneBy(User, { id: userId });

    // Base query for current events, joining necessary relationships
    const queryBuilder = this.entityManager
      .createQueryBuilder(Event, 'events')
      .leftJoinAndSelect('events.tickets', 'tickets')
      .where('events.eventStatus = :status', { status: 'published' })
      .andWhere('events.userId = :userId', { userId });

    // Fetch current published events and total count
    const totalEvents = await queryBuilder.getCount();

    // Fetch the 5 most recent events
    const recentEvents = await this.getRecentEvents(queryBuilder);

    // Fetch past records for comparison (e.g., last month)
    // const pastMetrics = await this.getPastAnalytics(userId);
    //
    // Calculate percentage changes based on past data
    // const percentageChange = this.calculatePercentageChange(
    //   {
    //     totalTicketSold: user.ticketsSold,
    //     totalRevenue: user.totalRevenue,
    //     totalEvents,
    //   },
    //   pastMetrics,
    // );

    // count used tickets
    const usedTickets = await this.entityManager
      .createQueryBuilder(Booking, 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('event.userId = :userId', { userId })
      .andWhere('bookings.status = :bookingStatus', {
        bookingStatus: BookingStatus.USED,
      })
      .getCount();

    return {
      totalRevenue: user.totalRevenue,
      ticketsSold: user.ticketsSold,
      publishedEvents: totalEvents,
      totalParticipants: usedTickets, // Placeholder for future calculation
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

  // Helper to fetch past analytics (e.g., for the last month)
  private async getPastAnalytics(userId: string) {
    const pastQueryBuilder = this.entityManager
      .createQueryBuilder(Event, 'events')
      .leftJoinAndSelect('events.tickets', 'tickets')
      .where('events.eventStatus = :status', { status: 'published' })
      .andWhere('events.userId = :userId', { userId });

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Get two days ago
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const formattedYesterday = yesterday.toISOString().split('T')[0];
    const formattedTwoDaysAgo = twoDaysAgo.toISOString().split('T')[0];

    const start = new Date(formattedTwoDaysAgo);
    start.setHours(1, 0, 0, 0);

    const end = new Date(formattedYesterday);
    end.setHours(24, 59, 59, 999);

    pastQueryBuilder.andWhere('events.createdAt BETWEEN :start AND :end', {
      start,
      end,
    });

    const pastEvents = await pastQueryBuilder.getMany();

    const { totalTicketSold, totalRevenue } =
      this.calculateEventMetrics(pastEvents);

    return {
      totalTicketSold,
      totalRevenue,
      totalEvents: pastEvents.length,
    };
  }

  // Helper to calculate percentage increase/decrease
  private calculatePercentageChange(
    currentMetrics: {
      totalTicketSold: number;
      totalRevenue: number;
      totalEvents: number;
    },
    pastMetrics: {
      totalTicketSold: number;
      totalRevenue: number;
      totalEvents: number;
    },
  ) {
    return {
      totalTicketSoldChange: this.getPercentageChange(
        currentMetrics.totalTicketSold,
        pastMetrics.totalTicketSold,
      ),
      totalRevenueChange: this.getPercentageChange(
        currentMetrics.totalRevenue,
        pastMetrics.totalRevenue,
      ),
      totalEventsChange: this.getPercentageChange(
        currentMetrics.totalEvents,
        pastMetrics.totalEvents,
      ),
    };
  }

  // Helper to calculate percentage change between two numbers
  private getPercentageChange(current: number, past: number): number {
    if (past === 0) {
      return current === 0 ? 0 : 100; // If there's no past data, return 100% if there's current data
    }
    return ((current - past) / past) * 100;
  }

  // Helper to calculate metrics such as total tickets sold and revenue
  private calculateEventMetrics(events: Event[]): {
    totalTicketSold: number;
    totalRevenue: number;
  } {
    return events.reduce(
      (acc, event) => {
        event.tickets?.forEach((ticket) => {
          acc.totalTicketSold += ticket.numberOfTicketsSold;
          acc.totalRevenue += ticket.price * ticket.numberOfTicketsSold;
        });
        return acc;
      },
      { totalTicketSold: 0, totalRevenue: 0 },
    );
  }

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
