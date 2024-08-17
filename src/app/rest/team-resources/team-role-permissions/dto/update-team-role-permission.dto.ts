import { PartialType } from '@nestjs/swagger';
import { CreateTeamRolePermissionDto } from './create-team-role-permission.dto';

export class UpdateTeamRolePermissionDto extends PartialType(
  CreateTeamRolePermissionDto,
) {}
