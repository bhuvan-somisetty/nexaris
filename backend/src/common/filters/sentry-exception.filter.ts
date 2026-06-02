import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    if (request && typeof request.url === 'string') {
      // Capture context inside a local Sentry scope
      Sentry.withScope((scope) => {
        scope.setExtra('url', request.url);
        scope.setExtra('method', request.method);
        scope.setExtra('query', request.query);

        // Strip sensitive fields from request body before logging to Sentry
        if (request.body) {
          const bodyCopy = { ...request.body };
          const sensitiveKeys = [
            'password',
            'token',
            'refreshToken',
            'passwordHash',
            'signature',
          ];
          for (const key of sensitiveKeys) {
            if (key in bodyCopy) {
              bodyCopy[key] = '***REDACTED***';
            }
          }
          scope.setExtra('body', bodyCopy);
        }

        // Attach logged-in user details if available
        if (request.user) {
          scope.setUser({
            id: request.user.id,
            email: request.user.email,
            role: request.user.role,
          });
        }

        // Attach Prisma DB error codes & metadata
        if (exception.code) {
          scope.setExtra('prisma_error_code', exception.code);
          if (exception.meta) {
            scope.setExtra('prisma_error_meta', exception.meta);
          }
        }

        Sentry.captureException(exception);
      });
    }

    // Delegate standard response handling to NestJS base filter
    super.catch(exception, host);
  }
}
