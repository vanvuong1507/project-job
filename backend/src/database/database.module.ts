import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { createDataSourceOptions } from './typeorm.config.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => createDataSourceOptions(config.database),
    }),
  ],
})
export class DatabaseModule {}
