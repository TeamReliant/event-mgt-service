import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { GetCurrentUserId } from '@libs/decorators/get-current-user-id.decorator';
import { CreateBookingParamsDto } from '@app/rest/attendee/bookings/dto/create-booking-params.dto';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';
import { PaginationService } from '@libs/helpers/pagination/pagination.service';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { ShowBookingParamsDto } from '@app/rest/attendee/bookings/dto/show-booking-params.dto';
import { DeleteBookingParamsDto } from '@app/rest/attendee/bookings/dto/delete-booking-params.dto';
import { ProcessBookingDto } from '@app/rest/attendee/bookings/dto/process-booking.dto';
import { TransferBookingDto } from '@app/rest/attendee/bookings/dto/transfer-booking.dto';
import { VerifyBookingsTransactionDto } from '@app/rest/attendee/bookings/dto/verify-bookings-transaction.dto';
import { RolesGuard } from '@libs/Guards/rbac/roles.guard';
import { roles } from '@config/app.config';
import { Request } from 'express';
import { FetchBookingsQueriesDto } from '@app/rest/attendee/bookings/dto/fetch-bookings-queries.dto';
import { SoftJwtAuthGuard } from '@libs/Guards/jwt-auth/soft-jwt-auth.guard';
import { SendComplimentaryBookingDto } from '@app/rest/attendee/bookings/dto/send-complimentary-booking.dto';

@Controller()
export class BookingsController {
  constructor(
    private readonly _bookingsService: BookingsService,
    private readonly _paginationService: PaginationService,
  ) {}

  @Post('events/:eventId/bookings')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SoftJwtAuthGuard)
  async create(
    @Body() body: CreateBookingDto,
    @GetCurrentUserId() userId: string,
    @Param() { eventId }: CreateBookingParamsDto,
  ) {
    const response = await this._bookingsService.create(body, eventId, userId);
    return ResponseSerializer.data(response);
  }

  @Post('events/:eventId/bookings/process')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SoftJwtAuthGuard)
  async processBooking(
    @GetCurrentUserId() userId: string,
    @Body() body: ProcessBookingDto,
  ) {
    const response = await this._bookingsService.processBookings(body, userId);
    return ResponseSerializer.data(response);
  }

  @Get('bookings')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @GetCurrentUserId() userId: string,
    @Query() query: FetchBookingsQueriesDto,
    @Req() req: Request,
  ) {
    const response = this._bookingsService.findAll(userId, query);
    const paginatedData = await ResponseSerializer.applyHTEAOS(req, response);
    paginatedData.data = paginatedData.data.map((booking: Booking) => {
      return {
        ...booking,
        event: booking.event,
        ticket: booking.ticket,
        ticketType: booking.ticket.name,
        ticketNumber: booking.bookingId,
        date: booking.event.eventStartDateAndTime,
        status: booking.status,
      } as unknown as Booking;
    });

    return paginatedData;
  }

  @Get('bookings/:id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param() { id }: ShowBookingParamsDto) {
    let booking = await this._bookingsService.findOne(id);
    if (booking) {
      booking = {
        id: booking.id,
        ticketNumber: booking.bookingId,
        ticketType: booking.ticket.name,
        guestName: `${booking.firstName} ${booking.lastName}`,
        status: booking.status,
        paid: booking.paid,
        processed: booking.processed,
        eventName: booking.event.name,
      } as unknown as Booking;
    }

    return ResponseSerializer.data(booking);
  }

  @Delete('bookings/:id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param() { id }: DeleteBookingParamsDto,
    @GetCurrentUserId() userId: string,
  ) {
    await this._bookingsService.remove(id, userId);
    return ResponseSerializer.message('Booking removed successfully');
  }

  @Post('bookings/transfer')
  @HttpCode(HttpStatus.OK)
  async transfer(
    @Body() body: TransferBookingDto,
    @GetCurrentUserId() userId: string,
  ) {
    await this._bookingsService.transferBooking(body, userId);
    return ResponseSerializer.message('Booking transferred successfully');
  }

  @Post('bookings/complimentary')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard([roles.ORGANIZER]))
  async sendComplimentary(
    @Body() body: SendComplimentaryBookingDto,
    @GetCurrentUserId() userId: string,
  ) {
    await this._bookingsService.sendComplimentaryBooking(body, userId);
    return ResponseSerializer.message('Complimentary ticket sent successfully');
  }

  @Post('bookings/verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Body() { transactionId }: VerifyBookingsTransactionDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this._bookingsService.verifyBooking(
      transactionId,
      userId,
    );
    return ResponseSerializer.data(data);
  }
}
