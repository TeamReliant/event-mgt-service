import { Column, Entity, OneToMany } from 'typeorm';
import { TeamMember } from '@app/rest/team-resources/team-members/entities/team-member.entity';
import { TeamInvitation } from '@app/rest/team-resources/team-invitations/entities/team-invitation.entity';
import { AbstractEntity } from '@libs/database';

@Entity({ name: 'teams' })
export class Team extends AbstractEntity<Team> {
  @Column({ name: 'name', type: 'varchar', nullable: false })
  name: string;

  @Column({
    name: 'color',
    type: 'varchar',
    nullable: false,
    default: '#000000',
  })
  color?: string;

  @Column({ name: 'bio', type: 'text', nullable: true })
  bio?: string;

  @Column({ name: 'website', type: 'text', nullable: true })
  website?: string;

  // one-to-many relation with team members
  @OneToMany(() => TeamMember, (members) => members.team, { cascade: true })
  members?: TeamMember[];

  // one-to-many relation with team invitations
  @OneToMany(() => TeamInvitation, (invitations) => invitations.team, {
    cascade: true,
  })
  invitations?: TeamInvitation[];
}
