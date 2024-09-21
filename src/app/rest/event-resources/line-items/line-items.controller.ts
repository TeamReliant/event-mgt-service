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
} from '@nestjs/common';
import { LineItemsService } from './line-items.service';
import { CreateLineItemDto } from './dto/create-line-item.dto';
import { UpdateLineItemDto } from './dto/update-line-item.dto';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { GetCurrentUserId } from '@libs/decorators/get-current-user-id.decorator';
import { CreateLineItemParamsDto } from '@app/rest/event-resources/line-items/dto/create-line-item-params.dto';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';
import { FetchLineItemsParamsDto } from '@app/rest/event-resources/line-items/dto/fetch-line-items-params.dto';
import { FetchLineItemsQueriesDto } from '@app/rest/event-resources/line-items/dto/fetch-line-items-queries.dto';
import { PaginationService } from '@libs/helpers/pagination/pagination.service';
import { LineItem } from '@app/rest/event-resources/line-items/entities/line-item.entity';
import { ShowLineItemParamsDto } from '@app/rest/event-resources/line-items/dto/show-line-item-params.dto';
import { UpdateLineItemParamsDto } from '@app/rest/event-resources/line-items/dto/update-line-item-params.dto';
import { DeleteLineItemParamsDto } from '@app/rest/event-resources/line-items/dto/delete-line-item-params.dto';

@Controller('events/:eventId/line-items')
export class LineItemsController {
  constructor(
    private readonly lineItemsService: LineItemsService,
    private readonly paginationProvider: PaginationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() body: CreateLineItemDto,
    @GetCurrentUserId() userId: string,
    @Param() params: CreateLineItemParamsDto,
  ) {
    const data = await this.lineItemsService.create(
      body,
      params.eventId,
      userId,
    );
    delete data.event;
    return ResponseSerializer.data(data);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  findAll(
    @Param() params: FetchLineItemsParamsDto,
    @Query() query: FetchLineItemsQueriesDto,
  ) {
    const queryBuilder = this.lineItemsService.findAll(params.eventId, query);
    return this.paginationProvider.applyHTEAOS<LineItem>(queryBuilder);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async findOne(@Param() params: ShowLineItemParamsDto) {
    const data = await this.lineItemsService.findOne(params.eventId, params.id);
    return ResponseSerializer.data(data);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard)
  async update(
    @Param() params: UpdateLineItemParamsDto,
    @GetCurrentUserId() userId: string,
    @Body() updateLineItemDto: UpdateLineItemDto,
  ) {
    const data = await this.lineItemsService.update(
      params.eventId,
      params.id,
      userId,
      updateLineItemDto,
    );
    return ResponseSerializer.data(data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param() params: DeleteLineItemParamsDto,
    @GetCurrentUserId() userId: string,
  ) {
    await this.lineItemsService.remove(params.eventId, params.id, userId);
    return ResponseSerializer.message('Line item removed successfully');
  }
}
