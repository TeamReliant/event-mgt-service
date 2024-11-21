import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GuestsService } from './guests.service';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '@libs/Guards/rbac/roles.guard';
import { roles } from '@config/app.config';
import { CurrentUser } from '@libs/decorators/current-user.decorator';
import { TJwtPayload } from '@libs/types';
import { FindGuestsParamsDto } from '@app/rest/organizer/guest-resources/guests/dto/find-guests-params.dto';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';
import { Request } from 'express';
import { FindGuestsQueriesDto } from '@app/rest/organizer/guest-resources/guests/dto/find-guests-queries.dto';
import { BroadcastMessageParamsDto } from '@app/rest/organizer/guest-resources/guests/dto/broadcast-message-params.dto';
import { SendBroadcastMessageDto } from '@app/rest/organizer/guest-resources/guests/dto/send-broadcast-message.dto';
import { ShowGuestParamsDto } from '@app/rest/organizer/guest-resources/guests/dto/show-guest-params.dto';
import { CheckGuestParamsDto } from '@app/rest/organizer/guest-resources/guests/dto/check-guest-params.dto';
import { CheckGuestDto } from '@app/rest/organizer/guest-resources/guests/dto/check-guest.dto';

@Controller()
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Get('events/:eventId/guests')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard([roles.ORGANIZER]))
  async findAllGuests(
    @CurrentUser() user: TJwtPayload,
    @Param() { eventId }: FindGuestsParamsDto,
    @Req() request: Request,
    @Query() query: FindGuestsQueriesDto,
  ) {
    const data = this.guestsService.findAllGuests(eventId, user.userId, query);
    return ResponseSerializer.applyHTEAOS(request, data);
  }

  @Get('guests/:bookingId')
  @HttpCode(HttpStatus.OK)
  async showGuest(
    @Param() { bookingId }: ShowGuestParamsDto,
  ) {
    const data = await this.guestsService.showGuest(bookingId);
    return ResponseSerializer.data(data);
  }

  @Post('events/:eventId/guests/broadcast')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard([roles.ORGANIZER]))
  async broadcastGuests(
    @CurrentUser() user: TJwtPayload,
    @Param() { eventId }: BroadcastMessageParamsDto,
    @Body() body: SendBroadcastMessageDto,
  ) {
    await this.guestsService.sendBroadcastMessage(eventId, user.userId, body);
    return ResponseSerializer.message('Broadcast message sent successfully');
  }

  @Post('events/:eventId/guests/check')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard([roles.ORGANIZER]))
  async checkInGuest(
    @CurrentUser() user: TJwtPayload,
    @Param() { eventId }: CheckGuestParamsDto,
    @Body() body: CheckGuestDto,
  ) {
    const data = await this.guestsService.check(eventId, user.userId, body);
    return ResponseSerializer.data(data);
  }
}
