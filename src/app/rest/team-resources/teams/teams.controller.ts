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


@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
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
  async findOne(@Param('id') id: string): Promise<IResponseWithData> {
    const data = await this.teamsService.findOne(id, true);
    return ResponseSerializer.data(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: TJwtPayload,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    const data = await this.teamsService.update(id, user.userId, updateTeamDto);
    return ResponseSerializer.data(data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: TJwtPayload) {
    await this.teamsService.remove(id, user.userId);
    return ResponseSerializer.message('Team deleted successfully');
  }
}
