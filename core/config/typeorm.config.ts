import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleAsyncOptions =>
  ({
    type: 'postgres',
    host: configService.get('DATABASE_HOST') as string,
    port: configService.get('DATABASE_PORT') as number,
    username: configService.get('DATABASE_USER') as string,
    password: configService.get('DATABASE_PASSWORD') as string,
    database: configService.get('DATABASE_DB') as string,
    schema: configService.get('DATABASE_SCHEMA') as string,
    entities: ['dist/**/*.entity{.ts,.js}'],
    synchronize: false,
    autoLoadEntities: true,
    migrations: [__dirname + '/src/migrations/**/*{.ts,.js}'],
    seeds: [__dirname + '/src/seeds/**/*{.ts,.js}'],
    factories: [__dirname + '/src/factories/**/*{.ts,.js}'],
    cli: {
      migrationsDir: __dirname + '/src/migrations/',
    },
  }) as TypeOrmModuleAsyncOptions;
