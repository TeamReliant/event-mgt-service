import { AbstractEntity } from '@libs/database/abstract.entity';
import { Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TeamRole } from '@app/rest/team-resources/team-roles/entities/team-role.entity';
import { TeamPermission } from '@app/rest/team-resources/team-permissions/entities/team-permission.entity';

@Entity({ name: 'team_role_permissions' })
export class TeamRolePermission extends AbstractEntity<TeamRolePermission> {
  @ManyToOne(() => TeamRole, (teamRole) => teamRole.permissions)
  @JoinColumn({ name: 'teamRoleId' })
  teamRole: TeamRole;

  @ManyToOne(
    () => TeamPermission,
    (teamPermission) => teamPermission.teamRolePermissions,
  )
  @JoinColumn({ name: 'teamPermissionId' })
  teamPermission: TeamPermission;
}
