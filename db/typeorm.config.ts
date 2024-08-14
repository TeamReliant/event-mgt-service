import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get('DEV_DB_HOST'),
  port: configService.get('DEV_DB_PORT'),
  username: configService.get('DEV_DB_USER'),
  password: configService.get('DEV_DB_PASSWORD'),
  database: await configService.get('DEV_DB_NAME'),
  entities: [`${__dirname}/../src/**/*.entity{.ts,.js}`],
  synchronize: configService.get('nodenv') === 'development',
  logging: configService.get('nodenv') === 'development',
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  migrationsTableName: 'migrations',
});
