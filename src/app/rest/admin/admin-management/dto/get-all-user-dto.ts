import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { PaginationQueryDto } from '@libs/helpers/pagination/dto/pagination.query.dto';
import { Transform } from 'class-transformer';
import { UserStatus } from '../enums/user-status.enums';

export class GetAllUsersQueriesDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @FormatValidationException()
  search: string;

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
  @IsString()
  @IsEnum(UserStatus, {
    message: `status should either be ${UserStatus.ACTIVE}, ${UserStatus.INACTIVE}, ${UserStatus.BLOCKED}`,
  })
  @FormatValidationException()
  status: string;
}
