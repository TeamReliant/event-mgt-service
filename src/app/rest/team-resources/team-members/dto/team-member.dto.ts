import { UserDto } from '@app/rest/users/dto/shared/user.dto';
import { Expose, Type } from 'class-transformer';
import { TeamDto } from '../../teams/dto/team.dto';

export class TeamMemberDto {
  @Expose()
  id: number;

  @Expose()
  @Type(() => TeamDto)
  team: TeamDto;

  @Expose()
  @Type(() => UserDto)
  user: UserDto;

  @Expose()
  isAdmin?: boolean;

  @Expose()
  status?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
