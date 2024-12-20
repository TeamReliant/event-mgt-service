import { IsDate, IsEnum, IsOptional } from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { Transform } from 'class-transformer';

export class FetchActiveUsersAnalyticsQueryDto {
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

  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'], {
    message: 'range must be one of the following: daily, weekly, monthly',
  })
  @FormatValidationException()
  range?: 'daily' | 'weekly' | 'monthly';
}
