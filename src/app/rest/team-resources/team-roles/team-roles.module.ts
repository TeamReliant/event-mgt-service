import { Module } from '@nestjs/common';
import { TeamRolesService } from './team-roles.service';
import { TeamRolesController } from './team-roles.controller';

@Module({
  controllers: [TeamRolesController],
  providers: [TeamRolesService],
})
export class TeamRolesModule {}
