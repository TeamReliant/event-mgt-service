import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '@libs/helpers/pagination/dto/pagination.query.dto';

export class GetAllSubscribersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  @FormatValidationException()
  email: string;

  @IsOptional()
  @IsBoolean()
  @FormatValidationException()
  subscribed: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return date;
  })
  @IsDate()
  dateRangeStart: Date;

  @IsOptional()
  @Transform(({ value }) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return date;
  })
  @IsDate()
  dateRangeEnd: Date;
}
