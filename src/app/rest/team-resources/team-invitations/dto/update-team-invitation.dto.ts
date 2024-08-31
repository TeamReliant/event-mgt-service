import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';

export class UpdateTeamInvitationDto {
  @IsNotEmpty()
  @IsString()
  @IsEnum(['accepted', 'declined'], {
    message: 'status must be one of the following values: accepted, declined',
  })
  @FormatValidationException()
  status: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000, {
    message: 'string must be less than or equal to 1000 characters',
  })
  @FormatValidationException()
  token: string;
}
