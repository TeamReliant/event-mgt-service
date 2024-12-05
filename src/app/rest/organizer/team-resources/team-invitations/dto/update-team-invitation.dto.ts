import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from '@app/rest/users/dto/shared/create-user.dto';
import { UserType } from '@app/rest/users/enums/user-type';

export class UpdateTeamInvitationDto extends PartialType(CreateUserDto) {
  // @IsOptional()
  // @IsEnum(['registered', 'not-registered'], {
  //   message:
  //     'account must be one of the following values: registered, not-registered',
  // })
  // @FormatValidationException()
  // account: string;
  //
  // @IsString()
  // @MaxLength(255)
  // @IsEnum(UserType, {
  //   message: 'User type must be either organizer, attendee, or admin',
  // })
  // @ValidateIf((object) => object.account === 'not-registered')
  // @FormatValidationException()
  // userType: UserType;
  //
  // @IsString()
  // @MaxLength(255)
  // @ValidateIf((object) => object.account === 'not-registered')
  // @FormatValidationException()
  // firstname: string;
  //
  // @IsString()
  // @MaxLength(255)
  // @ValidateIf((object) => object.account === 'not-registered')
  // @FormatValidationException()
  // lastname: string;
  //
  // @MinLength(6)
  // @MaxLength(100)
  // @ValidateIf((object) => object.account === 'not-registered')
  // @FormatValidationException()
  // password: string;

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
