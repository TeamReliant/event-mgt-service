import { Injectable } from '@nestjs/common';
import { CreateTeamInvitationDto } from './dto/create-team-invitation.dto';
import { UpdateTeamInvitationDto } from './dto/update-team-invitation.dto';

@Injectable()
export class TeamInvitationsService {
  create(createTeamInvitationDto: CreateTeamInvitationDto) {
    return 'This action adds a new teamInvitation';
  }

  findAll() {
    return `This action returns all teamInvitations`;
  }

  findOne(id: number) {
    return `This action returns a #${id} teamInvitation`;
  }

  update(id: number, updateTeamInvitationDto: UpdateTeamInvitationDto) {
    return `This action updates a #${id} teamInvitation`;
  }

  remove(id: number) {
    return `This action removes a #${id} teamInvitation`;
  }
}
