import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AssignTeamDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  @FormatValidationException()
  teamId: string;
}
