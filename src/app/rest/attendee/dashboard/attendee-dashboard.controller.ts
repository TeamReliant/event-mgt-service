import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AttendeeDashboardService } from './attendee-dashboard.service';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '@libs/Guards/rbac/roles.guard';
import { roles } from '@config/app.config';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';
import { GetCurrentUserId } from '@libs/decorators/get-current-user-id.decorator';

@Controller('attendee-dashboard')
export class AttendeeDashboardController {
  constructor(
    private readonly attendeeDashboardService: AttendeeDashboardService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard([roles.ATTENDEE]))
  async getDashboardData(@GetCurrentUserId() userId: string) {
    const data = await this.attendeeDashboardService.getDashboardData(userId);
    return ResponseSerializer.data(data);
  }
}
