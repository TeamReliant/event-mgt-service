import { Expose, Type } from 'class-transformer';
import { TeamDto } from '../../teams/dto/team.dto';
import { UserInTeamDto } from '@app/rest/users/dto/shared/user-in-team-object.dto';
import { PermissionDto } from '../../permissions/dto/permissions.dto';

export class TeamMemberDto {
  @Expose()
  id: number;
  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Type(() => TeamDto)
  team: TeamDto;

  @Expose()
  isAdmin?: boolean;

  @Expose()
  status?: string;

  @Expose()
  deletedAt: Date;

  @Expose()
  @Type(() => UserInTeamDto)
  user: UserInTeamDto;

  @Expose()
  @Type(() => PermissionDto)
  permissions: PermissionDto;
}
