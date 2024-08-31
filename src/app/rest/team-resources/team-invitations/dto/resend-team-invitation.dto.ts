import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';

export class ResendTeamInvitationDto {
  @IsNotEmpty()
  @MaxLength(255, {
    message: 'string must be less than or equal to 255 characters',
  })
  @IsEmail()
  @FormatValidationException()
  email: string;
}
