import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Req,
  UnprocessableEntityException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { CurrentUser } from '@libs/decorators/current-user.decorator';
import { TJwtPayload } from '@libs/types';
import ResponseSerializer, {
  IResponseWithMessage,
} from '@libs/helpers/ResponseSerializer';
import { Request } from 'express';
import { SerializeResponse } from '@libs/interceptors/serialize-response.interceptor';
import { EventResponseDto } from './dto/event.dto';
import { ShowEventParamsDto } from '@app/rest/organizer/event-resources/events/dto/show-event-params.dto';
import { UpdateEventParamsDto } from '@app/rest/organizer/event-resources/events/dto/update-event-params.dto';
import { AssignTeamParamsDto } from '@app/rest/organizer/event-resources/events/dto/assign-team-params.dto';
import { AssignTeamDto } from '@app/rest/organizer/event-resources/events/dto/assign-team.dto';
import { GetOneEventResponseDto } from './dto/get-one-event-response.dto';
import { GetAllEventsResponseDto } from './dto/get-all-events-response.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { AttendeeShowEventParamsDto } from '@app/rest/organizer/event-resources/events/dto/attendee-show-event-params.dto';
import { PermissionsService } from '@app/rest/organizer/team-resources/permissions/permissions.service';
import { TeamPermissions } from '@app/rest/organizer/team-resources/permissions/enums/team-permissions';

const allowedFileTypes = ['.jpeg', '.jpg', '.png'];

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  @UseGuards(JwtAuthGuard)
  @SerializeResponse(EventResponseDto, 'data')
  @UseInterceptors(
    FileInterceptor('eventCoverImage', {
      fileFilter: (req, file, callback) => {
        const ext = extname(file.originalname).toLowerCase();
        if (allowedFileTypes.includes(ext)) {
          callback(null, true);
        } else {
          return callback(
            new UnprocessableEntityException(
              'Invalid file type, only .jpeg and .png files are allowed',
            ),
            false,
          );
        }
      },
    }),
  )
  async create(
    @Body() createEventDto: CreateEventDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: 3000000,
          message: 'Max file size allowed is 3MB',
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false,
        }),
    )
    eventCoverImage: Express.Multer.File,
    @CurrentUser() user: TJwtPayload,
  ) {
    try {
      createEventDto.eventCoverImage = eventCoverImage;
      return await this.eventsService.create(createEventDto, user);
    } catch (error) {
      if (error?.status === HttpStatus.UNPROCESSABLE_ENTITY) {
        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            error: error.message || 'File size exceeds 3MB limit',
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      throw error;
    }
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
  async findMyEvents(@Req() req: Request, @CurrentUser() user: TJwtPayload) {
    const queryBuilder = this.eventsService.findMyEvents(req, user);
    // const response = await ResponseSerializer.applyHTEAOSWithDtoFormatter<GetAllEventsResponseDto>(
    //   req,
    //   queryBuilder,
    //   GetAllEventsResponseDto,
    // );

    const response =
      await ResponseSerializer.applyHTEAOSWithDtoFormatter<GetAllEventsResponseDto>(
        req,
        queryBuilder,
        GetAllEventsResponseDto,
      );
    const { data } = response;
    response.data = data.map((event) => {
      let totalAvailableTickets = 0;
      let totalTicketSold = 0;
      event.tickets.forEach((ticket) => {
        totalAvailableTickets += ticket.availableTickets;
        totalTicketSold += ticket.numberOfTicketsSold;
      });

      event.totalTickets = totalAvailableTickets;
      event.totalTicketSold = totalTicketSold;
      delete event.tickets;
      delete event.user.password;
      delete event.user.refreshToken;
      delete event.user.passwordResetToken;
      delete event.user.magicSignInToken;
      return event;
    });

    return response;
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

  @Get(':slug/attendee')
  @HttpCode(HttpStatus.OK)
  async findOneForAttendee(@Param() { slug }: AttendeeShowEventParamsDto) {
    const data = await this.eventsService.findOneForAttendee(slug);
    return ResponseSerializer.data(data);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @SerializeResponse(EventResponseDto)
  @UseInterceptors(
    FileInterceptor('eventCoverImage', {
      fileFilter: (req, file, callback) => {
        const ext = extname(file.originalname).toLowerCase();
        if (allowedFileTypes.includes(ext)) {
          callback(null, true);
        } else {
          return callback(
            new UnprocessableEntityException(
              'Invalid file type, only .jpeg and .png files are allowed',
            ),
            false,
          );
        }
      },
    }),
  )
  async update(
    @Param() params: UpdateEventParamsDto,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser() user: TJwtPayload,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: 3000000,
          message: 'Max file size allowed is 3MB',
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false,
        }),
    )
    eventCoverImage?: Express.Multer.File,
  ) {
    // check if the user is permitted
    await this.permissionsService.isUserPermitted(
      user.userId,
      params.id,
      TeamPermissions.EVENT_BUILDER,
    );

    try {
      if (eventCoverImage) {
        updateEventDto.eventCoverImage = eventCoverImage;
      }
      return await this.eventsService.update(params.id, updateEventDto);
    } catch (error) {
      if (error?.status === HttpStatus.UNPROCESSABLE_ENTITY) {
        throw new HttpException(
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            error: error.message || 'File size exceeds 3MB limit',
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      throw error;
    }
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

  @Post(':id/team/remove')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async removeTeamFromEvent(
    @Param() params: AssignTeamParamsDto,
    @CurrentUser() user: TJwtPayload,
  ) {
    await this.eventsService.deallocateTeam(params.id, user.userId);
    return ResponseSerializer.message('Team removed successfully');
  }
}
