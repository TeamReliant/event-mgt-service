import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTeamDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @FormatValidationException()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @FormatValidationException()
  color?: string = '#fff';

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @FormatValidationException()
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @FormatValidationException()
  website?: string;

  @IsOptional()
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
  members?: string[] = [];
}
