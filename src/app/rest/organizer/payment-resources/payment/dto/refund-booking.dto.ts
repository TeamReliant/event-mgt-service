import { IsNotEmpty, IsUUID } from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';

export class RefundBookingDto {
  @IsNotEmpty()
  @IsUUID()
  @FormatValidationException()
  bookingId: string;
}
