import { User } from '@app/rest/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
} from 'typeorm';
import { Team } from '@app/rest/team-resources/teams/entities/team.entity';
import { Permission } from '@app/rest/team-resources/permissions/entities/permission.entity';
import { AbstractEntity } from '@libs/database';

@Entity({ name: 'team_members' })
export class TeamMember extends AbstractEntity<TeamMember> {
  @ManyToOne(() => Team, (team) => team.members)
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @ManyToOne(() => User, (user) => user.teamMembers)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    name: 'is_admin',
    type: 'boolean',
    default: false,
  })
  isAdmin?: boolean;

  @Column({
    name: 'status',
    type: 'varchar',
    default: 'active',
  })
  status?: string; // active, inactive, or exited

  @ManyToMany(() => Permission, (permission) => permission.teamMembers)
  @JoinTable({
    name: 'team_members_permissions',
    joinColumn: { name: 'teamMemberId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions?: Permission[];
}
