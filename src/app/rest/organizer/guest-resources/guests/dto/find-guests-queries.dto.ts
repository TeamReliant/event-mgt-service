import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { BookingStatus } from '@app/rest/attendee/bookings/enums/booking-status';
import { TicketCategory } from '@app/rest/organizer/ticket-resources/tickets/enums';
import { Transform } from 'class-transformer';

export class FindGuestsQueriesDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ValidateIf((object) => object.sortDir)
  @FormatValidationException()
  sort: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsEnum(['ASC', 'DESC'], {
    message: 'sortDir must be either ASC or DESC',
  })
  @FormatValidationException()
  sortDir: string = 'ASC';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @FormatValidationException()
  ticketNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @FormatValidationException()
  search: string;

  @IsOptional()
  @IsEnum(BookingStatus, {
    message: 'status must be either valid, pending, or used',
  })
  @FormatValidationException()
  status: BookingStatus;

  @IsOptional()
  @IsEnum(TicketCategory, {
    message: 'category should either be free or paid',
  })
  @FormatValidationException()
  category: TicketCategory;

  @IsOptional()
  @Transform(({ value }) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return date;
  })
  @IsDate()
  dateRangeStart: Date;

  @IsOptional()
  @Transform(({ value }) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return date;
  })
  @IsDate()
  dateRangeEnd: Date;
}
