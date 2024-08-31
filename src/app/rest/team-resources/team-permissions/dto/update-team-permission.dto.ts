import { PartialType } from '@nestjs/swagger';
import { CreateTeamPermissionDto } from './create-team-permission.dto';

export class UpdateTeamPermissionDto extends PartialType(
  CreateTeamPermissionDto,
) {}
