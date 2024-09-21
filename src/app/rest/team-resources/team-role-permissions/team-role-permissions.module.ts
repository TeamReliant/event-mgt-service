import { Module } from '@nestjs/common';
import { TeamRolePermissionsService } from './team-role-permissions.service';
import { TeamRolePermissionsController } from './team-role-permissions.controller';

@Module({
  controllers: [TeamRolePermissionsController],
  providers: [TeamRolePermissionsService],
})
export class TeamRolePermissionsModule {}
