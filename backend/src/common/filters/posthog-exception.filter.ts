import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { posthog } from '../../posthog';

@Catch()
export class PostHogExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Only capture server errors (5xx) — 4xx are expected client errors
    if (status >= 500) {
      const userId = (request as any).user?.id;
      posthog.captureException(exception, userId, {
        url: request.url,
        method: request.method,
        status_code: status,
      });
    }

    response
      .status(status)
      .json(
        exception instanceof HttpException
          ? exception.getResponse()
          : { statusCode: status, message: 'Internal server error' },
      );
  }
}
