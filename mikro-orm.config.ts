import { defineConfig } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';

export default defineConfig({
  driver: PostgreSqlDriver,

  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dbName: process.env.DB_DES,

  entities: ['./src/**/*.entity.ts'],

  extensions: [Migrator],

  migrations: {
    path: './src/migrations',
    glob: '!(*.d).{js,ts}',
  },
});
