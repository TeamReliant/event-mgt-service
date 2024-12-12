import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventAnalyticsService } from './event-analytics.service';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { GetCurrentUserId } from '@libs/decorators/get-current-user-id.decorator';
import ResponseSerializer, {
  IResponseWithData,
} from '@libs/helpers/ResponseSerializer';
import { EventAnalyticsParamsDto } from '@app/rest/organizer/analytics-resources/event-analytics/dto/event-analytics-params.dto';
import { FetchEventAnalyticsQueriesDto } from '@app/rest/organizer/analytics-resources/event-analytics/dto/fetch-event-analytics-queries.dto';
import { TeamPermissions } from '@app/rest/organizer/team-resources/permissions/enums/team-permissions';
import { PermissionsService } from '@app/rest/organizer/team-resources/permissions/permissions.service';

@Controller()
export class EventAnalyticsController {
  constructor(
    private readonly eventAnalyticsService: EventAnalyticsService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Get('event-analytics/:eventId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getAnalytics(
    @GetCurrentUserId() userId: string,
    @Param() params: EventAnalyticsParamsDto,
    @Query() query: FetchEventAnalyticsQueriesDto,
  ): Promise<IResponseWithData> {
    // check if the user is permitted
    await this.permissionsService.isUserPermitted(
      userId,
      params.eventId,
      TeamPermissions.ANALYTICS,
    );

    const data = await this.eventAnalyticsService.getAnalytics(
      params.eventId,
      query,
    );
    return ResponseSerializer.data(data);
  }
}
