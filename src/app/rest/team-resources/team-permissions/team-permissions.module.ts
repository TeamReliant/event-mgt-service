import { Module } from '@nestjs/common';
import { TeamPermissionsService } from './team-permissions.service';
import { TeamPermissionsController } from './team-permissions.controller';

@Module({
  controllers: [TeamPermissionsController],
  providers: [TeamPermissionsService],
})
export class TeamPermissionsModule {}
