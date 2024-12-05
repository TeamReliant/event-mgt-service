import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { FreeTicketReaction } from '@app/rest/attendee/bookings/enums/free-ticket-reaction';

export class UpdateFreeBookingDto {
  @IsNotEmpty()
  @IsUUID()
  @FormatValidationException()
  bookingId: string;

  @IsNotEmpty()
  @IsEnum(FreeTicketReaction, {
    message: 'ticket reaction should either be going, not going , or maybe',
  })
  @FormatValidationException()
  reaction?: FreeTicketReaction;
}
