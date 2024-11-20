import {
  Controller,
  Get,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { Request } from 'express';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';
import { EventResponseDto } from '@app/rest/organizer/event-resources/events/dto/event.dto';
import { SerializeResponse } from '@libs/interceptors/serialize-response.interceptor';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('find-events')
  async findEvents(@Req() req: Request) {
    const events = await this.marketplaceService.findEvents(req);
    return ResponseSerializer.applyHTEAOSWithDtoFormatter<EventResponseDto>(req, events, EventResponseDto);
  }

  @Get('find-top-events')
  @SerializeResponse(EventResponseDto, 'collection')
  async findTopEvents(@Req() req: RawBodyRequest<Request>) {
    return await this.marketplaceService.findTopEvents(req);
  }
}
