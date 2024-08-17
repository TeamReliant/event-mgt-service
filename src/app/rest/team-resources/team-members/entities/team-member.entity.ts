import { User } from '@app/rest/users/entities/user.entity';
import { AbstractEntity } from '@libs/database/abstract.entity';
import { Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Team } from '@app/rest/team-resources/teams/entities/team.entity';
import { TeamRole } from '@app/rest/team-resources/team-roles/entities/team-role.entity';

@Entity({ name: 'team_members' })
export class TeamMember extends AbstractEntity<TeamMember> {
  @ManyToOne(() => Team, (team) => team.members)
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @ManyToOne(() => User, (user) => user.teamMembers)
  @JoinColumn({ name: 'userId' })
  user: User;

  // one-to-one relation with team role
  @ManyToOne(() => TeamRole, (role) => role.teamMembers)
  @JoinColumn({ name: 'teamRoleId' })
  role: TeamRole;
}
