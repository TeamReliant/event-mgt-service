import { CreateTeamInvitationParamsDto } from '@app/rest/team-resources/team-invitations/dto/create-team-invitation-params.dto';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';

export class ShowTeamInvitationParamsDto extends CreateTeamInvitationParamsDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  @FormatValidationException()
  id: string;
}
