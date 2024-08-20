import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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
  color: string = '#fff';

  @IsOptional()
  @IsArray()
  @IsEmail(
    {},
    {
      each: true,
      message: 'each element in the array must be an email',
    },
  )
  members: string[];
}
