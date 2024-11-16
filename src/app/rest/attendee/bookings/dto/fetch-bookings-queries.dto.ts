import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { PaginationQueryDto } from '@libs/helpers/pagination/dto/pagination.query.dto';
import { BookingStatus } from '@app/rest/attendee/bookings/enums/booking-status';
import { parseISO } from 'date-fns';
import { Transform } from 'class-transformer';

export class FetchBookingsQueriesDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @FormatValidationException()
  search: string;

  @IsOptional()
  @Transform(({ value }) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return date;
  })
  @IsDate()
  date: Date;

  @IsOptional()
  @IsString()
  @IsEnum(BookingStatus, {
    message: `status should either be ${BookingStatus.VALID}, ${BookingStatus.PENDING}, ${BookingStatus.TRANSFERRED_OUT}, ${BookingStatus.TRANSFERRED_IN}, ${BookingStatus.USED}`,
  })
  @FormatValidationException()
  status: string;
}
