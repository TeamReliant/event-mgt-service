import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { OrganizerDashboardService } from './organizer-dashboard.service';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import ResponseSerializer, {
  IResponseWithData,
} from '@libs/helpers/ResponseSerializer';
import { GetCurrentUserId } from '@libs/decorators/get-current-user-id.decorator';

@Controller()
export class OrganizerDashboardController {
  constructor(
    private readonly organizerDashboardService: OrganizerDashboardService,
  ) {}

  @Get('organizer-dashboard')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async dashboard(
    @GetCurrentUserId() userId: string,
  ): Promise<IResponseWithData> {
    const data = await this.organizerDashboardService.getAnalytics(userId);
    return ResponseSerializer.data(data);
  }
}
