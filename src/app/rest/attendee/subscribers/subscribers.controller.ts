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
} from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';
import { PaginationService } from '@libs/helpers/pagination/pagination.service';
import { Subscriber } from '@app/rest/attendee/subscribers/entities/subscriber.entity';
import { ShowSubscriberParamsDto } from '@app/rest/attendee/subscribers/dto/show-subscriber-params.dto';
import { DeleteSubscriberParamsDto } from '@app/rest/attendee/subscribers/dto/delete-subscriber-params.dto';

@Controller('subscribers')
export class SubscribersController {
  constructor(
    private readonly _subscribersService: SubscribersService,
    private readonly _paginationService: PaginationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateSubscriberDto) {
    const response = await this._subscribersService.create(body);
    return ResponseSerializer.data(response);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll() {
    const response = this._subscribersService.findAll();
    return this._paginationService.applyHTEAOS<Subscriber>(response);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param() { id }: ShowSubscriberParamsDto) {
    const response = await this._subscribersService.findOne(id);
    return ResponseSerializer.data(response);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  async update(@Body() body: UpdateSubscriberDto) {
    const response = await this._subscribersService.update(body);
    return ResponseSerializer.data(response);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param() { id }: DeleteSubscriberParamsDto) {
    await this._subscribersService.remove(id);
    return ResponseSerializer.message('Subscriber removed successfully');
  }
}
