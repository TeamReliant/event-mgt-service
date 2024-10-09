import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToOne } from "typeorm";
import { Team } from '@app/rest/team-resources/teams/entities/team.entity';
import { User } from '@app/rest/users/entities/user.entity';
import { AbstractEntity } from '@libs/database';
import { TeamMember } from '@app/rest/team-resources/team-members/entities/team-member.entity';

@Entity({ name: 'team_invitations' })
export class TeamInvitation extends AbstractEntity<TeamInvitation> {
  @ManyToOne(() => Team, (team) => team.invitations)
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @ManyToOne(() => User, (user) => user.invitations)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ name: 'email', type: 'varchar', nullable: false })
  email: string;

  @Column({ name: 'token', type: 'varchar', nullable: true })
  token?: string;

  @Column({
    name: 'status',
    type: 'varchar',
    default: 'pending',
    nullable: false,
  })
  status: string; // pending, accepted, declined

  @OneToOne(() => TeamMember, (member) => member.invitation)
  member?: TeamMember;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
