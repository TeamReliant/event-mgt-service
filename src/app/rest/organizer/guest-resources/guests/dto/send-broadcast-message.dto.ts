import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import {
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class SendBroadcastMessageDto {
  @IsNotEmpty()
  @IsArray()
  @IsUUID(4, {
    each: true,
    message: 'Each element of the array must be a valid UUID',
  })
  @FormatValidationException()
  bookingIds: string[];

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @FormatValidationException()
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  @FormatValidationException()
  message: string;
}
