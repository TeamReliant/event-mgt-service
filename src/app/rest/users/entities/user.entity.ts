import { TeamInvitation } from '@app/rest/team-resources/team-invitations/entities/team-invitation.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { TeamMember } from '@app/rest/team-resources/team-members/entities/team-member.entity';
import { AbstractEntity } from '@libs/database';

@Entity({ name: 'users' })
export class User extends AbstractEntity<User> {
  @Column({ name: 'firstname', type: 'varchar', length: 255, nullable: true })
  firstname?: string;

  @Column({ name: 'lastname', type: 'varchar', length: 255, nullable: true })
  lastname?: string;

  @Column({ unique: true, nullable: false, length: 255 })
  email: string;

  @Column({ name: 'picture', type: 'text', nullable: true })
  picture?: string;

  @Column({ name: 'password', type: 'varchar', length: 255, nullable: true })
  password?: string;

  @Column({
    name: 'magic_sign_in_token',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  magicSignInToken?: string;

  @Column({ name: 'email_verified_at', type: 'timestamp', nullable: true })
  emailVerifiedAt?: Date;

  @Column({ name: 'email_verification_token', nullable: true, type: 'bigint' })
  emailVerificationToken?: number;

  @Column({
    name: 'password_reset_token',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  passwordResetToken?: number;

  @Column({
    name: 'refresh_token',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  refreshToken?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  googleId?: string;

  // teams where the user is an admin
  @OneToMany(() => TeamMember, (members) => members.user, { cascade: true })
  teamMembers?: TeamMember[];

  @OneToMany(() => TeamInvitation, (invitation) => invitation.user, {
    cascade: true,
  })
  invitations?: TeamInvitation[];
}
