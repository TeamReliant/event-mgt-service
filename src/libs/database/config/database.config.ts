import { registerAs } from '@nestjs/config';

export default registerAs('database', () =>
  process.env.NODE_ENV == 'development' ? remoteDBConfig() : remoteDBConfig(),
);

const localDBConfig = () => {
  return {
    type: process.env.DEV_DB_TYPE,
    host: process.env.DEV_DB_HOST || 'localhost',
    port: parseInt(process.env.DEV_DB_PORT, 10) || 5432,
    username: process.env.DEV_DB_USER,
    password: process.env.DEV_DB_PASSWORD,
    database: process.env.DEV_DB_NAME,
    entities: [`${__dirname}/../../../../**/*.entity{.ts,.js}`],
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
    migrations: [`${__dirname}/../../../../../db/migrations/*{.ts,.js}`],
    migrationsTableName: 'migrations',
  };
};

const remoteDBConfig = () => {
  return {
    type: process.env.LIVE_DB_TYPE,
    host: process.env.LIVE_DB_HOST,
    port: parseInt(process.env.LIVE_DB_PORT, 10) || 5432,
    username: process.env.LIVE_DB_USER,
    password: process.env.LIVE_DB_PASSWORD,
    database: process.env.LIVE_DB_NAME,
    entities: [`${__dirname}/../../../../**/*.entity{.ts,.js}`],

    /* CONFIG FOR AUTO MIGRATION TO LIVE SERVER  */
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
    /* END OF CONFIG FOR AUTO MIGRATION TO LIVE SERVER  */

    migrations: [`${__dirname}/../../../../../db/migrations/*{.ts,.js}`],
    migrationsTableName: 'migrations',
  };
};
