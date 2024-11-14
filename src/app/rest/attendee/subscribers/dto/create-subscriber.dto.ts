import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';

export class CreateSubscriberDto {
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  @FormatValidationException()
  email: string;
}
