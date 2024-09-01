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
  UseInterceptors,
  UploadedFile,
  Req,
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

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @SerializeResponse(EventResponseDto, "data")
  @UseInterceptors(ImageUploadInterceptor('eventCoverImage'))
  async create(
    @Body() createEventDto: CreateEventDto,
    @UploadedFile(FileValidationPipe) eventCoverImage: Express.Multer.File,
    @CurrentUser() user: TJwtPayload,
  ) {
    createEventDto.eventCoverImage = eventCoverImage;
    const createdEvent = await this.eventsService.create(createEventDto, user);
    return createdEvent;
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
    const queryBuilder = await this.eventsService.findMyEvents(req, user);
    return await ResponseSerializer.applyHTEAOSWithDtoFormatter<EventResponseDto>(req, queryBuilder, EventResponseDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @SerializeResponse(EventResponseDto)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: TJwtPayload,
  ){
    const event = await this.eventsService.findOne(id, user);
    return event;
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @SerializeResponse(EventResponseDto)
  @UseInterceptors(ImageUploadInterceptor('eventCoverImage'))
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser() user: TJwtPayload,
    @UploadedFile(FileValidationPipe) eventCoverImage?: Express.Multer.File,
  ) {
    if (eventCoverImage) {
      updateEventDto.eventCoverImage = eventCoverImage;
    }
    const updatedEvent = await this.eventsService.update(id, updateEventDto, user);
    return updatedEvent;
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
}
