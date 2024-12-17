import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(private readonly _entityManage: EntityManager) {}

  async getActiveUsersChart() {

  }

  async getAnalytics() {

  }
}