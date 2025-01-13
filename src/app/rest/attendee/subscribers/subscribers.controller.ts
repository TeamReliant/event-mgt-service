import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';
import { PaginationService } from '@libs/helpers/pagination/pagination.service';
import { ShowSubscriberParamsDto } from '@app/rest/attendee/subscribers/dto/show-subscriber-params.dto';

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
}
