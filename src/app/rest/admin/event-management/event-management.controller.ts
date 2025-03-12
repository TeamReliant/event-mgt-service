import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EventManagementService } from './event-management.service';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { CurrentUser } from '@libs/decorators/current-user.decorator';
import { TJwtPayload } from '@libs/types';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';
import { RolesGuard } from '@libs/Guards/rbac/roles.guard';
import { UserType } from '@app/rest/users/enums/user-type';
import { Request } from 'express';

@Controller('admin/events')
export class EventManagementController {
  constructor(
    private readonly eventManagementService: EventManagementService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard([UserType.ADMIN]))
  async exportAllUsers(@CurrentUser() user: TJwtPayload, @Req() req: Request) {
    const queryBuilder = this.eventManagementService.getAllEvents(req);
    return await ResponseSerializer.applyHTEAOS(req, queryBuilder);
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard([UserType.ADMIN]))
  async export(@CurrentUser() user: TJwtPayload) {
    await this.eventManagementService.export(user.userId);
    return ResponseSerializer.message('Events exported successfully');
  }
}
