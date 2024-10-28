import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

@Injectable()
export class EventAnalyticsService {
  constructor(private readonly entityManager: EntityManager) {}

  async getAnalytics(userId: string, eventId) {
    return {
      grossRevenue: 0,
      netRevenue: 0,
      ticketsSold: 0,
      ticketsScanned: 0,
      attendanceRate: {
        value: 0,
        change: 0,
      },
    };
  }
}
