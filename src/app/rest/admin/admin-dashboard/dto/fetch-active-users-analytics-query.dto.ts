import { IsEnum, IsOptional } from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';

export class FetchActiveUsersAnalyticsQueryDto {
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'], {
    message: 'range must be one of the following: daily, weekly, monthly',
  })
  @FormatValidationException()
  range?: 'daily' | 'weekly' | 'monthly';
}
