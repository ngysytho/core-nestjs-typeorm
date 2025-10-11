import 'reflect-metadata';
import { DataSourceOptions } from 'typeorm';

const config: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_DB,
  schema: process.env.DATABASE_SCHEMA,
  synchronize: false,
  dropSchema: false,
  logging: 'all',
  logger: 'file',
  entities: ['src/**/*.entity{.ts,.js}'],
} as DataSourceOptions;

export default config;
