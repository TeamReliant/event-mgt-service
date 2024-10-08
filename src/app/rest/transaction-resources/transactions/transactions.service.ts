import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction } from './entities/transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TJwtPayload } from '@libs/types';
import { UsersService } from '@app/rest/users/users.service';
import { Request } from 'express';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly userService: UsersService,
  ) {}

  private async validateUser(user: TJwtPayload) {
    const currUser = await this.userService.findOneById(user.userId);
    if (!currUser) {
      throw new NotFoundException(
        `User with id: ${user.userId}, does not exist`,
      );
    }

    if (currUser.userType !== 'admin') {
      throw new UnauthorizedException('User not authorized');
    }
  }
  async create(transaction: CreateTransactionDto) {
    try {
      const savedTransaction = await this.transactionRepo.save(transaction);
      if (!savedTransaction) {
        throw new Error('Error saving transaction to database');
      }
    } catch (error) {
      console.error(error.message);
      throw new InternalServerErrorException('Error saving transaction to db');
    }
  }

  async findAll(user: TJwtPayload, req: Request) {
    try {
      this.validateUser(user);
      const { userId, paymentMethod, status, subscriptionId, createdAt, plan } =
        req.query;

      const queryBuilder =
        this.transactionRepo.createQueryBuilder('transaction');
      if (userId) {
        queryBuilder.andWhere('transaction.userId = :userId', { userId });
      }

      if (paymentMethod) {
        queryBuilder.andWhere('transaction.paymentMethod = :paymentMethod', {
          paymentMethod,
        });
      }

      if (status) {
        queryBuilder.andWhere('transaction.status = :status', { status });
      }

      if (subscriptionId) {
        queryBuilder.andWhere('transaction.subscriptionId = :subscriptionId', {
          subscriptionId,
        });
      }

      if (plan) {
        queryBuilder.andWhere('transaction.plan ILIKE :plan', {
          plan: `%${plan}%`,
        });
      }

      if (createdAt) {
        queryBuilder.andWhere('DATE(transaction.createdAt) = :createdAt', {
          createdAt,
        });
      }

      return queryBuilder;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        console.error('Error retrieving transactions:', error.message);
        throw error;
      } else if (error instanceof NotFoundException) {
        console.error('Error retrieving transactions:', error.message);
        throw error;
      }
      console.error('Error retrieving transactions:', error.message);
      throw new InternalServerErrorException('Error retrieving transactions');
    }
  }

  async findOne(transactionId: string, user: TJwtPayload) {
    try {
      this.validateUser(user);

      const transaction = await this.transactionRepo.findOneBy({
        transactionId,
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found: ');
      }

      return transaction;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        console.error('Error retrieving transaction:', error.message);
        throw error;
      } else if (error instanceof NotFoundException) {
        console.error('Error retrieving transaction:', error.message);
        throw error;
      }
      console.error('Error retrieving transaction:', error.message);
      throw new InternalServerErrorException('Error retrieving transaction');
    }
  }
}
