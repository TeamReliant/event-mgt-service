import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SubscribersManagementService } from './subscribers-management.service';
import { GetAllSubscribersQueryDto } from '@app/rest/admin/subscribers-management/dto/get-all-subscribers-query.dto';
import { Subscriber } from '@app/rest/attendee/subscribers/entities/subscriber.entity';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';
import { PaginationService } from '@libs/helpers/pagination/pagination.service';
import { DeleteSubscriberParamsDto } from '@app/rest/admin/subscribers-management/dto/delete-subscriber-params.dto';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { CurrentUser } from '@libs/decorators/current-user.decorator';
import { TJwtPayload } from '@libs/types';
import { RolesGuard } from '@libs/Guards/rbac/roles.guard';
import { UserType } from '@app/rest/users/enums/user-type';

@Controller('admin/subscribers')
export class SubscribersManagementController {
  constructor(
    private readonly _subscribersManagementService: SubscribersManagementService,
    private readonly _paginationService: PaginationService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard([UserType.ADMIN]))
  findAll(@Query() query: GetAllSubscribersQueryDto) {
    const response = this._subscribersManagementService.findAll(query);
    return this._paginationService.applyHTEAOS<Subscriber>(response);
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard([UserType.ADMIN]))
  async export(@CurrentUser() user: TJwtPayload) {
    await this._subscribersManagementService.export(user.userId);
    return ResponseSerializer.message('Subscribers exported successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard([UserType.ADMIN]))
  async remove(@Param() { id }: DeleteSubscriberParamsDto) {
    await this._subscribersManagementService.remove(id);
    return ResponseSerializer.message('Subscriber removed successfully');
  }
}
