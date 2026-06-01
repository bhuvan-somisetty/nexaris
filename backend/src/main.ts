import * as Sentry from '@sentry/nestjs';

// Initialize Sentry before bootstrapping the app
Sentry.init({
  dsn: process.env.SENTRY_BACKEND_DSN || process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Register Helmet middleware for security headers
  app.use(helmet());

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable CORS for dynamic frontend origins
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [
      frontendUrl,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
  });

  // Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
