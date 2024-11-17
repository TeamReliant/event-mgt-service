import {
  Controller,
  Get,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { Request } from 'express';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { CurrentUser } from '@libs/decorators/current-user.decorator';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';
import { EventResponseDto } from '@app/rest/organizer/event-resources/events/dto/event.dto';
import { SerializeResponse } from '@libs/interceptors/serialize-response.interceptor';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('find-events')
  @SerializeResponse(EventResponseDto, 'collection')
  async findEvents(@Req() req: Request) {
    return await this.marketplaceService.findEvents(req);
  }

  @Get('find-top-events')
  @SerializeResponse(EventResponseDto, 'collection')
  async findTopEvents(@Req() req: RawBodyRequest<Request>) {
    return await this.marketplaceService.findTopEvents(req);
  }
}
