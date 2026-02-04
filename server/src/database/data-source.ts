import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'tap_of_exile',
  password: process.env.DB_PASSWORD || 'tap_of_exile_dev',
  database: process.env.DB_NAME || 'tap_of_exile',
  entities: ['src/shared/entities/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});
