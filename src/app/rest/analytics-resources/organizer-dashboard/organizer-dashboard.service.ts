import { Injectable } from '@nestjs/common';
import { Brackets, EntityManager, SelectQueryBuilder } from 'typeorm';
import { Event } from '@app/rest/event-resources/events/entities/event.entity';

@Injectable()
export class OrganizerDashboardService {
  constructor(private readonly entityManager: EntityManager) {}

  public async getAnalytics(userId: string) {
    // Base query for events, joining necessary relationships
    const queryBuilder = this.entityManager
      .createQueryBuilder(Event, 'events')
      .leftJoinAndSelect('events.tickets', 'tickets')
      .where('events.eventStatus = :status', { status: 'published' })
      .andWhere('events.userId = :userId', { userId });

    // Fetching all published events for the user and the total count
    const [events, totalEvents] = await queryBuilder.getManyAndCount();

    // Calculate total tickets sold and total revenue
    const { totalTicketSold, totalRevenue } =
      this.calculateEventMetrics(events);

    // Fetch the 5 most recent events
    const recentEvents = await this.getRecentEvents(queryBuilder);

    return {
      totalRevenue,
      ticketsSold: totalTicketSold,
      publishedEvents: totalEvents,
      attendanceRate: 0, // Placeholder for future calculation
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
