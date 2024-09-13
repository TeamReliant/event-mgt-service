import { Module } from '@nestjs/common';
import { TeamMembersService } from './team-members.service';
import { TeamMembersController } from './team-members.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamMember } from '@app/rest/team-resources/team-members/entities/team-member.entity';
import { UsersModule } from '@app/rest/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([TeamMember]), UsersModule],
  controllers: [TeamMembersController],
  providers: [TeamMembersService],
  exports: [TeamMembersService],
})
export class TeamMembersModule {}
