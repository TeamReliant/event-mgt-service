import { Controller, Get, Post, Body, Patch, Param, Delete, HttpStatus, HttpCode, UseGuards, Req } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { CurrentUser } from '@libs/decorators/current-user.decorator';
import { TJwtPayload } from '@libs/types';
import { Request } from 'express';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';
import { TransactionDto } from './dto/transaction.dto';
import { SerializeResponse } from '@libs/interceptors/serialize-response.interceptor';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser() user: TJwtPayload, @Req() req: Request) {
   const transactionsQueryBuilder = await this.transactionsService.findAll(user, req);
   return await ResponseSerializer.applyHTEAOSWithDtoFormatter<TransactionDto>(req, transactionsQueryBuilder, TransactionDto);
  }

  @Get(':transactionId')
  @HttpCode(HttpStatus.OK)
  @SerializeResponse(TransactionDto, 'data')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('transactionId') transactionId: string, @CurrentUser() user: TJwtPayload) {
    const transaction = await this.transactionsService.findOne(transactionId, user);

    return transaction;
  }
}
