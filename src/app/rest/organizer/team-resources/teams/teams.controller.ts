import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  HttpCode,
  Req,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { TJwtPayload } from '@libs/types';
import { CurrentUser } from '@libs/decorators/current-user.decorator';
import ResponseSerializer, {
  IResponseWithData,
} from '@libs/helpers/ResponseSerializer';
import { Request } from 'express';
import { ShowTeamParamsDto } from '@app/rest/organizer/team-resources/teams/dto/show-team-params.dto';
import { UpdateTeamParamsDto } from '@app/rest/organizer/team-resources/teams/dto/update-team-params.dto';
import { DeleteTeamParamsDto } from '@app/rest/organizer/team-resources/teams/dto/delete-team-params.dto';
import { RolesGuard } from '@libs/Guards/rbac/roles.guard';
import { roles } from '@config/app.config';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard([roles.ADMIN, roles.ORGANIZER]))
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createTeamDto: CreateTeamDto,
    @CurrentUser() user: TJwtPayload,
  ): Promise<IResponseWithData> {
    const data = await this.teamsService.create(createTeamDto, user.userId);
    return ResponseSerializer.data(data);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async findAll(@CurrentUser() user: TJwtPayload, @Req() req: Request) {
    const queryBuilder = this.teamsService.findAll(user.userId, req);
    return ResponseSerializer.applyHTEAOS(req, queryBuilder);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param() showTeamDto: ShowTeamParamsDto,
  ): Promise<IResponseWithData> {
    const data = await this.teamsService.findOne(showTeamDto.id, true);
    return ResponseSerializer.data(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard([roles.ADMIN, roles.ORGANIZER]))
  @HttpCode(HttpStatus.OK)
  async update(
    @Param() updateTeamParams: UpdateTeamParamsDto,
    @CurrentUser() user: TJwtPayload,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    const data = await this.teamsService.update(
      updateTeamParams.id,
      user.userId,
      updateTeamDto,
    );
    return ResponseSerializer.data(data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard([roles.ADMIN, roles.ORGANIZER]))
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param() deleteTeamParamsDto: DeleteTeamParamsDto,
    @CurrentUser() user: TJwtPayload,
  ) {
    await this.teamsService.remove(deleteTeamParamsDto.id, user.userId);
    return ResponseSerializer.message('Team deleted successfully');
  }
}
