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
import { ResendTeamInvitationDto } from '@app/rest/organizer/team-resources/team-invitations/dto/resend-team-invitation.dto';
import { CreateTeamInvitationParamsDto } from '@app/rest/organizer/team-resources/team-invitations/dto/create-team-invitation-params.dto';
import { FetchTeamInvitationsParamsDto } from '@app/rest/organizer/team-resources/team-invitations/dto/fetch-team-invitations-params.dto';
import { ShowTeamInvitationParamsDto } from '@app/rest/organizer/team-resources/team-invitations/dto/show-team-invitation-params.dto';
import { ResendTeamInvitationParamsDto } from '@app/rest/organizer/team-resources/team-invitations/dto/resend-team-invitation-params.dto';
import { DeleteTeamInvitationParamsDto } from '@app/rest/organizer/team-resources/team-invitations/dto/delete-team-invitation-params.dto';

@Controller()
export class TeamInvitationsController {
  constructor(
    private readonly teamInvitationsService: TeamInvitationsService,
  ) {}

  @Post('teams/:teamId/invitations')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createTeamInvitationDto: CreateTeamInvitationDto,
    @Param() params: CreateTeamInvitationParamsDto,
    @GetCurrentUserId() userId: string,
  ) {
    return this.teamInvitationsService.inviteUser(
      createTeamInvitationDto,
      params.teamId,
      userId,
    );
  }

  @Get('teams/:teamId/invitations')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  findAll(@Param() params: FetchTeamInvitationsParamsDto, @Req() req: Request) {
    const queryBuilder = this.teamInvitationsService.findAll(params.teamId);
    return ResponseSerializer.applyHTEAOS(req, queryBuilder);
  }

  @Get('teams/:teamId/invitations/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param() params: ShowTeamInvitationParamsDto,
  ): Promise<IResponseWithData> {
    const data = await this.teamInvitationsService.findOne(
      params.teamId,
      params.id,
    );
    return ResponseSerializer.data(data);
  }

  @Post('teams/:teamId/invitations/resend')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async resendInvitation(
    @Param() params: ResendTeamInvitationParamsDto,
    @GetCurrentUserId() userId: string,
    @Body() resendTeamInvitationDto: ResendTeamInvitationDto,
  ): Promise<IResponseWithMessage> {
    await this.teamInvitationsService.resendInvitation(
      params.teamId,
      userId,
      resendTeamInvitationDto,
    );
    return ResponseSerializer.message('Team invitation resent successfully');
  }

  @Post('invitations/respond')
  @HttpCode(HttpStatus.OK)
  async update(
    @Body() updateTeamInvitationDto: UpdateTeamInvitationDto,
  ): Promise<IResponseWithData> {
    const data = await this.teamInvitationsService.update(
      updateTeamInvitationDto,
    );

    delete data.token;
    delete data.user?.password;
    delete data.user?.emailVerificationToken;
    delete data.user?.emailVerifiedAt;
    delete data.user?.passwordResetToken;
    delete data.user?.magicSignInToken;
    delete data.user?.refreshToken;

    return ResponseSerializer.data(data);
  }

  @Delete('teams/:teamId/invitations/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param() params: DeleteTeamInvitationParamsDto,
    @GetCurrentUserId() userId: string,
  ): Promise<IResponseWithMessage> {
    await this.teamInvitationsService.remove(params.teamId, params.id, userId);
    return ResponseSerializer.message('Team invitation deleted successfully');
  }
}
