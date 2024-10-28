import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

@Injectable()
export class GeneralEventAnalyticsService {
  constructor(private readonly entityManager: EntityManager) {}

  async getGeneralEventAnalytics(userId: string) {
    return {
      totalRevenue: {
        value: 0,
        change: 0,
      },
      ticketsSold: {
        value: 0,
        change: 0,
      },
      publishedEvents: {
        value: 0,
        change: 0,
      },
      attendanceRate: {
        value: 0,
        change: 0,
      },
    };
  }
}
