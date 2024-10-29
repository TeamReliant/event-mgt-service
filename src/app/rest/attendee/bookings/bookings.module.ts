import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaginationModule } from '@libs/helpers/pagination/pagination.module';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { UsersModule } from '@app/rest/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking]), UsersModule, PaginationModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
