import { Expose, Type } from 'class-transformer';
import { TeamDto } from '../../teams/dto/team.dto';
import { UserInTeamDto } from '@app/rest/users/dto/shared/user-in-team-object.dto';

export class TeamMemberDto {
  @Expose()
  id: number;

  @Expose()
  @Type(() => TeamDto)
  team: TeamDto;

  @Expose()
  @Type(() => UserInTeamDto)
  user: UserInTeamDto;

  @Expose()
  isAdmin?: boolean;

  @Expose()
  status?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
