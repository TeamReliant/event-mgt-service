import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';

export class TransferBookingDto {
  @IsNotEmpty()
  @IsUUID()
  @FormatValidationException()
  bookingId: string;

  @IsNotEmpty()
  @IsEmail()
  @FormatValidationException()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @FormatValidationException()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @FormatValidationException()
  lastName: string;
}
