import { AbstractEntity } from '@libs/database/abstract.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Team } from '@app/rest/team-resources/teams/entities/team.entity';
import { TeamRolePermission } from '@app/rest/team-resources/team-role-permissions/entities/team-role-permission.entity';
import { TeamMember } from '@app/rest/team-resources/team-members/entities/team-member.entity';

@Entity({ name: 'team_roles' })
export class TeamRole extends AbstractEntity<TeamRole> {
  @ManyToOne(() => Team, (team) => team.members)
  @JoinColumn({ name: 'teamId' })
  team: Team;

  // The permissions of the role
  @OneToMany(() => TeamRolePermission, (permissions) => permissions.teamRole)
  permissions: TeamRolePermission[];

  // Team members with the role
  @OneToMany(() => TeamMember, (members) => members.role)
  teamMembers: TeamMember[];

  @Column({ name: 'name', type: 'varchar', nullable: false })
  name: string;
}
