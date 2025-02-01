import { Module } from '@nestjs/common';
import { GuestsService } from './guests.service';
import { GuestsController } from './guests.controller';
import { UsersModule } from '@app/rest/users/users.module';
import { PermissionsModule } from '@app/rest/organizer/team-resources/permissions/permissions.module';

@Module({
  imports: [UsersModule, PermissionsModule],
  controllers: [GuestsController],
  providers: [GuestsService],
  exports: [GuestsService],
})
export class GuestsModule {}
