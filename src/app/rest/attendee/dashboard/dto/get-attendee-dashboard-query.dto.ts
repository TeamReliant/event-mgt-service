import { IsLatitude, IsLongitude, IsOptional } from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';

export class GetAttendeeDashboardQueryDto {
  @IsOptional()
  @IsLongitude()
  @FormatValidationException()
  longitude: string;

  @IsOptional()
  @IsLatitude()
  @FormatValidationException()
  latitude: string;
}
