import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CustomLoggerService } from '@libs/services/logging/custom-logger.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private logger = new CustomLoggerService();

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, body, query, params } = req;
    const startTime = Date.now();

    this.logger.log(
      `Incoming Request: ${method} ${originalUrl} | Params: ${JSON.stringify(params)} | Query: ${JSON.stringify(query)} | Body: ${JSON.stringify(body)}`,
    );

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      this.logger.log(
        `Response: ${res.statusCode} ${method} ${originalUrl} | Duration: ${duration}ms`,
      );
    });

    next();
  }
}
