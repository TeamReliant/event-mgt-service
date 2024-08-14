import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import {
  IsArray,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { IsFile } from 'nestjs-form-data';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsLatitude()
  @Transform(({ value }) => parseFloat(value))
  @FormatValidationException()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  @Transform(({ value }) => parseFloat(value))
  @FormatValidationException()
  longitude?: number;

  @IsOptional()
  @IsEnum(['male', 'female'], {
    message: 'gender must be one of the following values: male, female',
  })
  @FormatValidationException()
  gender?: string;

  @IsOptional()
  @IsArray({ message: 'User media must be an array' })
  @IsNotEmpty({
    each: true,
    message: 'No element in the array should be empty',
  })
  @IsFile({ each: true, message: 'Each element in user_media must be a file' })
  // @IsMimeType({ each: true, groups: ['jpeg'] })
  @MaxLength(255, {
    each: true,
    message: 'Each element in user_media must not exceed 255 characters',
  })
  @FormatValidationException()
  userMedia?: any;
}
