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

@Controller()
export class BookingsController {
  constructor(
    private readonly _bookingsService: BookingsService,
    private readonly _paginationService: PaginationService,
  ) {}

  @Post('events/:eventId/bookings')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() body: CreateBookingDto,
    @GetCurrentUserId() userId: string,
    @Param() { eventId }: CreateBookingParamsDto,
  ) {
    const response = await this._bookingsService.create(body, eventId, userId);
    return ResponseSerializer.data(response);
  }

  @Get('bookings')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  findAll(@GetCurrentUserId() userId: string) {
    const response = this._bookingsService.findAll(userId);
    return this._paginationService.applyHTEAOS<Booking>(response);
  }

  @Get('bookings/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async findOne(@Param() { id }: ShowBookingParamsDto) {
    const response = await this._bookingsService.findOne(id);
    return ResponseSerializer.data(response);
  }

  @Delete('bookings/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param() { id }: DeleteBookingParamsDto,
    @GetCurrentUserId() userId: string,
  ) {
    await this._bookingsService.remove(id, userId);
    return ResponseSerializer.message('Booking removed successfully');
  }
}
