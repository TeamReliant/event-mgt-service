import { Column, Entity, JoinColumn, ManyToMany, ManyToOne } from 'typeorm';
import { TeamMember } from '../../team-members/entities/team-member.entity';
import { AbstractEntity } from '@libs/database';
import { Team } from '@app/rest/team-resources/teams/entities/team.entity';

@Entity({ name: 'permissions' })
export class Permission extends AbstractEntity<Permission> {
  @Column({ name: 'name', type: 'varchar', nullable: false })
  name: string;

  @ManyToOne(() => Team, (team: Team) => team.permissions)
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @ManyToOne(() => TeamMember, (member: TeamMember) => member.permissions)
  @JoinColumn({ name: 'teamMemberId' })
  member: TeamMember;
}
