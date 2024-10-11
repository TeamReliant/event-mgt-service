import { User } from '@app/rest/users/entities/user.entity';
import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Team } from '@app/rest/team-resources/teams/entities/team.entity';
import { Permission } from '@app/rest/team-resources/permissions/entities/permission.entity';
import { AbstractEntity } from '@libs/database';
import { TeamInvitation } from '@app/rest/team-resources/team-invitations/entities/team-invitation.entity';
import { Task } from '@app/rest/event-resources/tasks/entities/task.entity';

@Entity({ name: 'team_members' })
export class TeamMember extends AbstractEntity<TeamMember> {
  @Column({
    name: 'is_admin',
    type: 'boolean',
    default: false,
  })
  isAdmin?: boolean;

  @Column({
    name: 'status',
    type: 'varchar',
    default: 'pending',
  })
  status?: string; // active, inactive, pending, or exited

  @ManyToOne(() => User, (user) => user.teamMembers)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Team, (team) => team.members)
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @OneToOne(() => TeamInvitation, (invitation) => invitation.member)
  @JoinColumn({ name: 'invitationId' })
  invitation: TeamInvitation;

  @OneToMany(() => Permission, (permission) => permission.member)
  permissions?: Permission[];

  @OneToMany(() => Task, (task) => task.assignee)
  tasks: Task[];

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
  // @ManyToMany(() => Permission, (permission) => permission.teamMembers)
  // @JoinTable({
  //   name: 'team_members_permissions',
  //   joinColumn: { name: 'teamMemberId', referencedColumnName: 'id' },
  //   inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  // })
  // permissions?: Permission[];
}
