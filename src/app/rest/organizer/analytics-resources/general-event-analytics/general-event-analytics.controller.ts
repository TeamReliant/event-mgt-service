import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GeneralEventAnalyticsService } from './general-event-analytics.service';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { GetCurrentUserId } from '@libs/decorators/get-current-user-id.decorator';
import ResponseSerializer, {
  IResponseWithData,
} from '@libs/helpers/ResponseSerializer';
import { Request } from 'express';

@Controller()
export class GeneralEventAnalyticsController {
  constructor(
    private readonly generalEventAnalyticsService: GeneralEventAnalyticsService,
  ) {}

  @Get('general-event-analytics')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getGeneralEventAnalytics(
    @GetCurrentUserId() userId: string,
    @Req() req: Request,
  ): Promise<IResponseWithData> {
    const data =
      await this.generalEventAnalyticsService.getGeneralEventAnalytics(
        userId,
        req,
      );
    return ResponseSerializer.data(data);
  }
}
