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
  Query,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { CurrentUser } from '@libs/decorators/current-user.decorator';
import { TJwtPayload } from '@libs/types';
import ResponseSerializer, {
  IResponseWithData,
  IResponseWithMessage,
} from '@libs/helpers/ResponseSerializer';
import { SerializeResponse } from '@libs/interceptors/serialize-response.interceptor';
import { TicketDto } from './dto/ticket.dto';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @SerializeResponse(TicketDto)
  async create(
    @Body() createTicketDto: CreateTicketDto,
    @Query('eventId') eventId: string,
    @CurrentUser() user: TJwtPayload,
  ) {
    if (!eventId) {
      throw new BadRequestException('Event ID is required');
    }
    const savedTicket = await this.ticketsService.create(
      createTicketDto,
      eventId,
      user,
    );
    return savedTicket;
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @SerializeResponse(TicketDto)
  async findOne(@Param('id') ticketId: string, @CurrentUser() user: TJwtPayload) {  
    const ticket = await this.ticketsService.findOne(ticketId, user);
    return ticket;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @SerializeResponse(TicketDto, "collection")
  async findAll(
    @Query('eventId') eventId: string,
    @CurrentUser() user: TJwtPayload,
  ) {
    const tickets = await this.ticketsService.findAll(eventId, user);
    return tickets;
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @SerializeResponse(TicketDto)
  async update(
    @Param('id') ticketId: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @CurrentUser() user: TJwtPayload,
  ) {
    const updatedTicket = await this.ticketsService.update(
      ticketId,
      updateTicketDto,
      user,
    );
    return updatedTicket;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') ticketId: string, @CurrentUser() user: TJwtPayload): Promise<IResponseWithMessage>{
    await this.ticketsService.remove(ticketId, user);
    return ResponseSerializer.message('Ticket deleted successfully');

  }
}
