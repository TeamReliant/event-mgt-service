import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';

export class UpdateTeamMemberDto {
  @IsNotEmpty()
  @IsEnum(['active', 'inactive', 'exited'], {
    message: 'status must be either active, inactive, or exited',
  })
  @FormatValidationException()
  status?: string;
}
