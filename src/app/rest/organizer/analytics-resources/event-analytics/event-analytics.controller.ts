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

@Controller()
export class EventAnalyticsController {
  constructor(private readonly eventAnalyticsService: EventAnalyticsService) {}

  @Get('event-analytics/:eventId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getAnalytics(
    @GetCurrentUserId() userId: string,
    @Param() params: EventAnalyticsParamsDto,
    @Query() query: FetchEventAnalyticsQueriesDto,
  ): Promise<IResponseWithData> {
    const data = await this.eventAnalyticsService.getAnalytics(
      userId,
      params.eventId,
      query,
    );
    return ResponseSerializer.data(data);
  }
}
