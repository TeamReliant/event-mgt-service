import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { FetchTeamMembersParamsDto } from '@app/rest/team-resources/team-members/dto/fetch-team-members-params.dto';

export class ShowTeamMemberParamsDto extends FetchTeamMembersParamsDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  @FormatValidationException()
  id: string;
}
