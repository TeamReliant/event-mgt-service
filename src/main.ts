import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { CustomExceptionFilter } from '@libs/filters/custom-exception.filter';
import { CustomValidationPipe } from '@libs/pipes/custom-validation.pipe';

import * as bodyParser from 'body-parser';
import { ValidationPipe } from '@nestjs/common';
import { FormattedValidationPipe } from "@libs/pipes/formatted-validation-pipe";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const configService = app.get(ConfigService);

  // Custom exceptions filter
  app.useGlobalFilters(new CustomExceptionFilter());

  // Cross-origin resource sharing configuration.
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  // Global route prefix, v1 is the version number
  app.setGlobalPrefix('api/v1/em', {
    //exclude some routes
  });

  // Attaching the validation piper at the global level
  // app.useGlobalPipes(new CustomValidationPipe());

  app.useGlobalPipes(new FormattedValidationPipe());

  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true, // Strip properties that are not in the DTO
  //     forbidNonWhitelisted: true, // Throw an error when an unknown property is provided
  //     transform: true, // Automatically transform payloads to match DTO types
  //     transformOptions: {
  //       enableImplicitConversion: true, // Allow for implicit type conversion
  //     },
  //   }),
  // );

  const port = configService.get<number>('PORT');

  await app.listen(port);
}
bootstrap();
