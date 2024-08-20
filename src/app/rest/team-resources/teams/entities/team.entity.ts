import { AbstractEntity } from '@libs/database/abstract.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { TeamMember } from '@app/rest/team-resources/team-members/entities/team-member.entity';
import { TeamInvitation } from '@app/rest/team-resources/team-invitations/entities/team-invitation.entity';

@Entity({ name: 'teams' })
export class Team extends AbstractEntity<Team> {
  @Column({
    name: 'email',
    type: 'varchar',
    nullable: false,
  })
  name: string;

  @Column({
    name: 'color',
    type: 'varchar',
    nullable: true,
  })
  color: string;

  @Column({
    name: 'bio',
    type: 'text',
    nullable: true,
  })
  bio: string;

  @Column({
    name: 'website',
    type: 'text',
    nullable: false,
  })
  website: string;

  // one-to-many relation with team members
  @OneToMany(() => TeamMember, (members) => members.team, { cascade: true })
  members: TeamMember[];

  @OneToMany(() => TeamInvitation, (invitations) => invitations.team, {
    cascade: true,
  })
  invitations: TeamInvitation[];
}
