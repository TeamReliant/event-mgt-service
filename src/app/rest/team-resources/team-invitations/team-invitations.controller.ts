import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TeamInvitationsService } from './team-invitations.service';
import { CreateTeamInvitationDto } from './dto/create-team-invitation.dto';
import { UpdateTeamInvitationDto } from './dto/update-team-invitation.dto';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { GetCurrentUserId } from '@libs/decorators/get-current-user-id.decorator';
import { Request } from 'express';
import ResponseSerializer, {
  IResponseWithData,
  IResponseWithMessage,
} from '@libs/helpers/ResponseSerializer';
import { ResendTeamInvitationDto } from '@app/rest/team-resources/team-invitations/dto/resend-team-invitation.dto';

@Controller('teams/:teamId/invitations')
export class TeamInvitationsController {
  constructor(
    private readonly teamInvitationsService: TeamInvitationsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createTeamInvitationDto: CreateTeamInvitationDto,
    @Param('teamId') teamId: string,
    @GetCurrentUserId() userId: string,
  ) {
    return this.teamInvitationsService.create(
      createTeamInvitationDto,
      teamId,
      userId,
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  findAll(@Param('teamId') teamId: string, @Req() req: Request) {
    const queryBuilder = this.teamInvitationsService.findAll(teamId);
    return ResponseSerializer.applyHTEAOS(req, queryBuilder);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('teamId') teamId: string,
    @Param('id') id: string,
  ): Promise<IResponseWithData> {
    const data = await this.teamInvitationsService.findOne(teamId, id);
    return ResponseSerializer.data(data);
  }

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async resendInvitation(
    @Param('teamId') teamId: string,
    @GetCurrentUserId() userId: string,
    @Body() resendTeamInvitationDto: ResendTeamInvitationDto,
  ): Promise<IResponseWithMessage> {
    await this.teamInvitationsService.resendInvitation(
      teamId,
      userId,
      resendTeamInvitationDto,
    );
    return ResponseSerializer.message('Team invitation resent successfully');
  }

  @Post('respond')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @Body() updateTeamInvitationDto: UpdateTeamInvitationDto,
  ): Promise<IResponseWithData> {
    const data = await this.teamInvitationsService.update(
      teamId,
      id,
      updateTeamInvitationDto,
    );
    return ResponseSerializer.data(data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @GetCurrentUserId() userId: string,
  ): Promise<IResponseWithMessage> {
    await this.teamInvitationsService.remove(teamId, id, userId);
    return ResponseSerializer.message('Team invitation deleted successfully');
  }
}
