import { Module } from '@nestjs/common';
import { TeamInvitationsService } from './team-invitations.service';
import { TeamInvitationsController } from './team-invitations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamInvitation } from '@app/rest/organizer/team-resources/team-invitations/entities/team-invitation.entity';
import { UsersModule } from '@app/rest/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([TeamInvitation]), UsersModule],
  controllers: [TeamInvitationsController],
  providers: [TeamInvitationsService],
  exports: [TeamInvitationsService],
})
export class TeamInvitationsModule {}
