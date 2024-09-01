import { Column, Entity, OneToMany } from 'typeorm';
import { TeamRolePermission } from '@app/rest/team-resources/team-role-permissions/entities/team-role-permission.entity';
import { AbstractEntity } from '@libs/database';

@Entity({ name: 'team_permissions' })
export class TeamPermission extends AbstractEntity<TeamPermission> {
  @OneToMany(
    () => TeamRolePermission,
    (permissions) => permissions.teamPermission,
  )
  teamRolePermissions: TeamRolePermission[];

  @Column({ name: 'name', type: 'varchar', nullable: false })
  name: string;
}
