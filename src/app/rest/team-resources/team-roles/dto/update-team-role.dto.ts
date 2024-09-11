import { PartialType } from '@nestjs/swagger';
import { CreateTeamRoleDto } from './create-team-role.dto';

export class UpdateTeamRoleDto extends PartialType(CreateTeamRoleDto) {}
