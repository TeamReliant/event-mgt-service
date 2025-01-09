import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import ResponseSerializer, {
  IResponseWithData,
} from '@libs/helpers/ResponseSerializer';
import { FetchActiveUsersAnalyticsQueryDto } from '@app/rest/admin/admin-dashboard/dto/fetch-active-users-analytics-query.dto';

@Controller('admin/dashboard')
// @UseGuards(JwtAuthGuard, RolesGuard([UserType.ADMIN]))
export class AdminDashboardController {
  constructor(private readonly _adminDashboardService: AdminDashboardService) {}

  @Get('active-users-chart')
  @HttpCode(HttpStatus.OK)
  async activeUsersChart(
    @Query()
    { dateRangeStart, dateRangeEnd, range }: FetchActiveUsersAnalyticsQueryDto,
  ): Promise<IResponseWithData> {
    // check if the user is permitted

    const data = await this._adminDashboardService.getActiveUsersChart(
      dateRangeStart,
      dateRangeEnd,
      range,
    );
    return ResponseSerializer.data(data);
  }

  @Get('analytics')
  @HttpCode(HttpStatus.OK)
  async assign(): Promise<IResponseWithData> {
    // check if the user is permitted
    const data = await this._adminDashboardService.getAnalytics();
    return ResponseSerializer.data(data);
  }
}
