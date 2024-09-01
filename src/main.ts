import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { CustomExceptionFilter } from '@libs/filters/custom-exception.filter';
import { CustomValidationPipe } from '@libs/pipes/custom-validation.pipe';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { UsersService } from '@app/rest/users/users.service';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  // const usersService = app.get(UsersService);

  // await usersService.seedUser();

  // Custom exceptions filter
  app.useGlobalFilters(new CustomExceptionFilter());

  /*
   * swagger configuration
   */
  const config = new DocumentBuilder()
    .setTitle('Plaventi Event Management Service - REST API')
    .setDescription(
      'Use the base API URL as http://localhost:5000/api/v1/event-mngt',
    )
    .setTermsOfService('http://localhost:3000/terms-of-service')
    .setLicense(
      'MIT License',
      'https://github.com/git/git-scm.com/blob/main/MIT-LICENSE.txt',
    )
    .addServer('api/v1/teams')
    .setVersion('1.0')
    .build();

  // Instantiate Document
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Cross-origin resource sharing configuration.
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  // Global route prefix, v1 is the version number
  app.setGlobalPrefix('api/v1', {
    //exclude some routes
  });

  // Attaching the validation piper at the global level
  app.useGlobalPipes(new CustomValidationPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
);

  const port = configService.get<number>('PORT');

  await app.listen(port);
}
bootstrap();
