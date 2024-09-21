import { errors as errorCodes } from '@config/app.config';
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnprocessableEntityException,
  NotAcceptableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnprocessableEntityException,
  NotAcceptableException,
  InternalServerErrorException,
)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | UnauthorizedException
      | NotFoundException
      | ForbiddenException
      | ConflictException
      | UnprocessableEntityException
      | NotAcceptableException
      | InternalServerErrorException,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const errorResponse = exception.getResponse() as {
      status: string;
      data?: any;
      message: string;
      errors: any;
    };

    const { data, message, errors } = errorResponse;
    let statusCode: number;
    let status: string;

    if (exception instanceof NotFoundException) {
      statusCode = 404;
      status = errorCodes.NOT_FOUND_ERROR;
    } else if (exception instanceof UnauthorizedException) {
      statusCode = 401;
      status = errorCodes.AUTHORIZATION_ERROR;
    } else if (exception instanceof ForbiddenException) {
      statusCode = 403;
      status = errorCodes.FORBIDDEN_ERROR;
    } else if (exception instanceof ConflictException) {
      statusCode = 409;
      status = errorCodes.DATA_CONFLICT_ERROR;
    } else if (exception instanceof UnprocessableEntityException) {
      statusCode = 422;
      status = errorCodes.UNPROCESSABLE_DATA_ERROR;
    } else if (exception instanceof NotAcceptableException) {
      statusCode = 406;
      status = errorCodes.NOT_ACCEPTABLE_ERROR;
    } else if (exception instanceof InternalServerErrorException) {
      statusCode = 500;
      status = errorCodes.INTERNAL_SERVER_ERROR;
    } else {
      statusCode = 500;
      status = errorCodes.INTERNAL_SERVER_ERROR;
    }

    response.status(statusCode).json({
      status,
      message,
      data,
      errors,
    });
  }
}
