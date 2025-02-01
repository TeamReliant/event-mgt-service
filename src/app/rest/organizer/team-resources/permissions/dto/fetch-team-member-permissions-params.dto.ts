import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';

export class FetchTeamMemberPermissionsParamsDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  @FormatValidationException()
  teamId: string;

  @IsNotEmpty()
  @IsString()
  @IsUUID()
  @FormatValidationException()
  memberId: string;
}
