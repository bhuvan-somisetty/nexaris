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
import compression from 'compression';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  // Boot as a standalone worker process if configured
  if (process.env.RUN_WORKER_ONLY === 'true') {
    const app = await NestFactory.createApplicationContext(AppModule, {
      bufferLogs: true,
    });
    app.useLogger(app.get(Logger));
    console.log('Nexaris worker-only context is running in standalone mode.');
    return;
  }

  // Create NestJS app with log buffering enabled for Pino
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino logger globally
  app.useLogger(app.get(Logger));

  // Register Helmet middleware for security headers
  app.use(helmet());

  // Register Compression middleware
  app.use(compression());

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable CORS for dynamic frontend origins.
  // Allows: explicit FRONTEND_URL, localhost dev, and any *.vercel.app deployment.
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const allowedOrigins = [frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'];
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(new URL(origin).hostname)
      ) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  });

  // Enable global validation pipe with security hardening (strict whitelist & forbid non-whitelisted params)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Configure OpenAPI Swagger UI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nexaris Enterprise API')
    .setDescription('The API documentation for Nexaris enterprise platform')
    .setVersion('2.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
  console.log(
    `OpenAPI documentation available on: http://localhost:${port}/api/docs`,
  );
}
bootstrap();
