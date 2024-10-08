import { Expose, Type } from 'class-transformer';
import { TeamMemberDto } from '../../team-members/dto/team-member.dto';

export class TeamDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  color?: string;

  @Expose()
  bio?: string;

  @Expose()
  website?: string;
  
  @Expose()
  @Type(() => TeamMemberDto)
  members?: TeamMemberDto[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
