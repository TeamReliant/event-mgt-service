import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TeamInvitationsService } from './team-invitations.service';
import { CreateTeamInvitationDto } from './dto/create-team-invitation.dto';
import { UpdateTeamInvitationDto } from './dto/update-team-invitation.dto';

@Controller('team-invitations')
export class TeamInvitationsController {
  constructor(
    private readonly teamInvitationsService: TeamInvitationsService,
  ) {}

  @Post()
  create(@Body() createTeamInvitationDto: CreateTeamInvitationDto) {
    return this.teamInvitationsService.create(createTeamInvitationDto);
  }

  @Get()
  findAll() {
    return this.teamInvitationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamInvitationsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTeamInvitationDto: UpdateTeamInvitationDto,
  ) {
    return this.teamInvitationsService.update(+id, updateTeamInvitationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teamInvitationsService.remove(+id);
  }
}
