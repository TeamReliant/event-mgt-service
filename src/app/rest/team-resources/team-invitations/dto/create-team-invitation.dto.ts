import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';

export class CreateTeamInvitationDto {
  @IsNotEmpty()
  @MaxLength(255)
  @IsEmail()
  @FormatValidationException()
  email: string;

  @IsNotEmpty()
  @IsNotEmpty({ each: true })
  @IsArray()
  @MaxLength(255, {
    each: true,
    message:
      'each string in the array must be less than or equal to 255 characters',
  })
  @IsEnum(
    ['analytics', 'budgeting', 'event builder', 'task', 'ticket scanning'],
    {
      each: true,
      message:
        'each element in the array must be one of the following values: analytics, budgeting, event builder, task, ticket scanning',
    },
  )
  @FormatValidationException()
  permissions: string[];
}
