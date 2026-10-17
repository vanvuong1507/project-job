import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap/configure-app.js';
import { createLogger } from './bootstrap/logger.js';
import { API_PREFIX, SWAGGER_PATH } from './common/constants/app.constants.js';
import { loadAppConfig } from './config/app-config.js';

async function bootstrap(): Promise<void> {
  const config = loadAppConfig();
  const logger = createLogger(config);
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(config), {
    logger,
    bodyParser: false, // registered with a size limit in configureApp
  });
  configureApp(app, config, logger);

  // Last-resort handlers: log with context, then exit so the process manager restarts a clean process.
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ message: 'Unhandled promise rejection', reason: String(reason) }, 'Process');
    void app.close().finally(() => process.exit(1));
  });
  process.on('uncaughtException', (error) => {
    logger.fatal({ message: 'Uncaught exception', error: error.message }, error.stack, 'Process');
    process.exit(1);
  });

  await app.listen(config.port);

  const base = `http://localhost:${config.port}`;
  logger.log(`API ready on ${base}/${API_PREFIX} (${config.env})`, 'Bootstrap');
  if (config.swagger.enabled) logger.log(`Swagger UI on ${base}/${SWAGGER_PATH}`, 'Bootstrap');
}

try {
  await bootstrap();
} catch (error) {
  // Config errors are already readable; anything else gets its stack.
  console.error(
    error instanceof Error && error.message.startsWith('Invalid environment')
      ? error.message
      : error,
  );
  process.exit(1);
}
