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
import { TeamMembersService } from './team-members.service';

import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import ResponseSerializer, {
  IResponseWithData,
  IResponseWithMessage,
} from '@libs/helpers/ResponseSerializer';
import { Request } from 'express';
import { GetCurrentUserId } from '@libs/decorators/get-current-user-id.decorator';

@Controller('teams/:teamId/members')
export class TeamMembersController {
  constructor(private readonly teamMembersService: TeamMembersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async findAll(@Param('teamId') teamId: string, @Req() req: Request) {
    const queryBuilder = this.teamMembersService.findAll(teamId);
    return ResponseSerializer.applyHTEAOS(req, queryBuilder);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('teamId') teamId: string,
    @Param('id') id: string,
  ): Promise<IResponseWithData> {
    const data = await this.teamMembersService.findOne(teamId, id);
    return ResponseSerializer.data(data);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @GetCurrentUserId() userId: string,
    @Body() updateTeamMemberDto: UpdateTeamMemberDto,
  ): Promise<IResponseWithData> {
    const data = await this.teamMembersService.update(
      teamId,
      id,
      userId,
      updateTeamMemberDto,
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
    await this.teamMembersService.remove(teamId, id, userId);
    return ResponseSerializer.message('Team member removed successfully');
  }
}
