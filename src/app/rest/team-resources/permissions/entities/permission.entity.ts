import { Column, Entity, ManyToMany } from 'typeorm';
import { TeamMember } from '../../team-members/entities/team-member.entity';
import { AbstractEntity } from '@libs/database';

@Entity({ name: 'permissions' })
export class Permission extends AbstractEntity<Permission> {
  @Column({ name: 'name', type: 'varchar', nullable: false })
  name: string;

  @ManyToMany(() => TeamMember, (member: TeamMember) => member.permissions)
  teamMembers: TeamMember[];
}
