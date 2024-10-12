import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { ImageUploadInterceptor } from '@libs/interceptors/event-cover-image-interceptor';
import { FileValidationPipe } from '@libs/pipes/file-validation.pipe';
import { CurrentUser } from '@libs/decorators/current-user.decorator';
import { TJwtPayload } from '@libs/types';
import ResponseSerializer, {
  IResponseWithData,
  IResponseWithMessage,
} from '@libs/helpers/ResponseSerializer';
import { Request } from 'express';
import { SerializeResponse } from '@libs/interceptors/serialize-response.interceptor';
import { EventResponseDto } from './dto/event.dto';
import { ShowEventParamsDto } from '@app/rest/event-resources/events/dto/show-event-params.dto';
import { UpdateEventParamsDto } from '@app/rest/event-resources/events/dto/update-event-params.dto';
import { AssignTeamParamsDto } from '@app/rest/event-resources/events/dto/assign-team-params.dto';
import { AssignTeamDto } from '@app/rest/event-resources/events/dto/assign-team.dto';
import { GetOneEventResponseDto } from './dto/get-one-event-response.dto';
import { GetAllEventsResponseDto } from './dto/get-all-events-response.dto';
import { plainToInstance } from 'class-transformer';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @SerializeResponse(EventResponseDto, 'data')
  @UseInterceptors(ImageUploadInterceptor('eventCoverImage'))
  async create(
    @Body() body: CreateEventDto,
    @UploadedFile(FileValidationPipe) eventCoverImage: Express.Multer.File,
    @CurrentUser() user: TJwtPayload,
  ) {
    let createEventDto = plainToInstance(CreateEventDto, body);
    createEventDto.eventCoverImage = eventCoverImage;
    return await this.eventsService.create(createEventDto, user);
  }

  // @Get()
  // @HttpCode(HttpStatus.OK)
  // @UseGuards(JwtAuthGuard)
  // async findAll(@Req() req: Request): Promise<IResponseWithData> {
  //   const queryBuilder = await this.eventsService.findAll(req);

  //   return await ResponseSerializer.applyHTEAOS(req, queryBuilder);
  // }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async findMyEvents(
    @Req() req: Request,
    @CurrentUser() user: TJwtPayload,
  ): Promise<IResponseWithData> {
    const queryBuilder = this.eventsService.findMyEvents(req, user);
    return await ResponseSerializer.applyHTEAOSWithDtoFormatter<GetAllEventsResponseDto>(
      req,
      queryBuilder,
      GetAllEventsResponseDto,
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @SerializeResponse(GetOneEventResponseDto)
  async findOne(
    @Param() params: ShowEventParamsDto,
    @CurrentUser() user: TJwtPayload,
  ) {
    return await this.eventsService.findOne(params.id, user);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @SerializeResponse(EventResponseDto)
  @UseInterceptors(ImageUploadInterceptor('eventCoverImage'))
  async update(
    @Param() params: UpdateEventParamsDto,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser() user: TJwtPayload,
    @UploadedFile(FileValidationPipe) eventCoverImage?: Express.Multer.File,
  ) {
    if (eventCoverImage) {
      updateEventDto.eventCoverImage = eventCoverImage;
    }
    return await this.eventsService.update(params.id, updateEventDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: TJwtPayload,
  ): Promise<IResponseWithMessage> {
    await this.eventsService.remove(id, user);
    return ResponseSerializer.message('Event deleted successfully');
  }

  @Post(':id/team')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async addTeamToEvent(
    @Param() params: AssignTeamParamsDto,
    @Body() body: AssignTeamDto,
    @CurrentUser() user: TJwtPayload,
  ) {
    const data = await this.eventsService.assignTeam(
      body,
      params.id,
      user.userId,
    );

    delete data.user;
    return ResponseSerializer.data(data);
  }
}
