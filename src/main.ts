import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { CustomExceptionFilter } from '@libs/filters/custom-exception.filter';
import { FormattedValidationPipe } from '@libs/pipes/formatted-validation-pipe';
import { CustomLoggerService } from '@libs/services/logging/custom-logger.service';

async function bootstrap() {
  const logger = new CustomLoggerService();

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: new CustomLoggerService(),
  });
  const configService = app.get(ConfigService);

  app.useGlobalFilters(new CustomExceptionFilter());

  app.enableCors({
    origin: '*path',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  app.setGlobalPrefix('api/v1/em', {
    //exclude some routes
  });

  app.useGlobalPipes(new FormattedValidationPipe());

  const port = configService.get<number>('PORT');

  // Catch Uncaught Exceptions (Sync Errors)
  process.on('uncaughtException', (error) => {
    logger.error(
      `Uncaught Exception: ${error.message} | Stack: ${error.stack}`,
    );
    process.exit(1); // Exit process after logging
  });

  // Catch Unhandled Promise Rejections (Async Errors)
  process.on('unhandledRejection', (reason: any) => {
    logger.error(`Unhandled Rejection: ${reason.message || reason}`);
  });

  await app.listen(port);
}
bootstrap();
