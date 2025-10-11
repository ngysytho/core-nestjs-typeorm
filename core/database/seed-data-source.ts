import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';
import mainConfig from './main';

export default new DataSource({
  ...mainConfig,
  migrations: ['src/seeds/**/*.ts'],
});
