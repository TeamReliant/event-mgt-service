import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TeamMembersService } from './team-members.service';

import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import ResponseSerializer, {
  IResponseWithData,
  IResponseWithMessage,
} from '@libs/helpers/ResponseSerializer';
import { Request } from 'express';
import { GetCurrentUserId } from '@libs/decorators/get-current-user-id.decorator';
import { FetchTeamMembersParamsDto } from '@app/rest/team-resources/team-members/dto/fetch-team-members-params.dto';
import { ShowTeamMemberParamsDto } from '@app/rest/team-resources/team-members/dto/show-team-member-params.dto';
import { UpdateTeamMemberParamsDto } from '@app/rest/team-resources/team-members/dto/update-team-member-params.dto';
import { DeleteTeamMemberParamsDto } from '@app/rest/team-resources/team-members/dto/delete-team-member-params.dto';

@Controller('teams/:teamId/members')
export class TeamMembersController {
  constructor(private readonly teamMembersService: TeamMembersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Param() params: FetchTeamMembersParamsDto,
    @Req() req: Request,
  ) {
    const queryBuilder = this.teamMembersService.findAll(params.teamId);
    return ResponseSerializer.applyHTEAOS(req, queryBuilder);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param() params: ShowTeamMemberParamsDto,
  ): Promise<IResponseWithData> {
    const data = await this.teamMembersService.findOne(
      params.teamId,
      params.id,
    );
    return ResponseSerializer.data(data);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async update(
    @Param() params: UpdateTeamMemberParamsDto,
    @GetCurrentUserId() userId: string,
    @Body() updateTeamMemberDto: UpdateTeamMemberDto,
  ): Promise<IResponseWithData> {
    const data = await this.teamMembersService.update(
      params.teamId,
      params.id,
      userId,
      updateTeamMemberDto,
    );
    return ResponseSerializer.data(data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param() params: DeleteTeamMemberParamsDto,
    @GetCurrentUserId() userId: string,
  ): Promise<IResponseWithMessage> {
    await this.teamMembersService.remove(params.teamId, params.id, userId);
    return ResponseSerializer.message('Team member removed successfully');
  }
}
