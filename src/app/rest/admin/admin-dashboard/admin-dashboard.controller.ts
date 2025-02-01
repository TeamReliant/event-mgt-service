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
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '@libs/Guards/rbac/roles.guard';
import { UserType } from '@app/rest/users/enums/user-type';

@Controller('admin/dashboard')
// @UseGuards(JwtAuthGuard, RolesGuard([UserType.ADMIN]))
export class AdminDashboardController {
  constructor(private readonly _adminDashboardService: AdminDashboardService) {}

  @Get('active-users-chart')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard([UserType.ADMIN]))
  async activeUsersChart(
    @Query()
    { dateRangeStart, dateRangeEnd, range }: FetchActiveUsersAnalyticsQueryDto,
  ): Promise<IResponseWithData> {
    const data = await this._adminDashboardService.getActiveUsersChart(
      dateRangeStart,
      dateRangeEnd,
      range,
    );
    return ResponseSerializer.data(data);
  }

  @Get('analytics')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard([UserType.ADMIN]))
  async assign(): Promise<IResponseWithData> {
    const data = await this._adminDashboardService.getAnalytics();
    return ResponseSerializer.data(data);
  }
}
