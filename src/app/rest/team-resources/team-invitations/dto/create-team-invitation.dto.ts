import { IsArray, IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';

export class CreateTeamInvitationDto {
  @IsNotEmpty()
  @IsNotEmpty({ each: true })
  @IsArray()
  @MaxLength(255, {
    each: true,
    message:
      'each string in the array must be less than or equal to 255 characters',
  })
  @IsEmail(
    {},
    {
      each: true,
      message: 'each element in the array must be an email',
    },
  )
  @FormatValidationException()
  emails: string[];
}
