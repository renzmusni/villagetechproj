// Exception filters for better error handling

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseError } from '../errors';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: HttpStatus;
    let errorResponse: any;

    if (exception instanceof BaseError) {
      // Handle our custom errors
      status = exception.getStatus();
      errorResponse = exception.getResponse();
    } else if (exception instanceof HttpException) {
      // Handle NestJS HTTP exceptions
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      errorResponse = {
        success: false,
        error: {
          code: exception.constructor.name,
          message: typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any).message || exception.message,
          details: typeof exceptionResponse === 'object' && exceptionResponse !== null
            ? (exceptionResponse as any)
            : undefined,
          timestamp: new Date().toISOString(),
        },
      };
    } else {
      // Handle unexpected errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Log the error
    this.logError(exception, request, status);

    // Send error response
    response.status(status).json({
      ...errorResponse,
      path: request.url,
      method: request.method,
    });
  }

  private logError(exception: unknown, request: Request, status: number): void {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';

    if (exception instanceof BaseError) {
      this.logger.error(
        `${method} ${url} - ${status} - Custom Error: ${exception.code} - ${exception.message}`,
        exception.stack,
        {
          ip,
          userAgent,
          details: exception.details,
        },
      );
    } else if (exception instanceof Error) {
      this.logger.error(
        `${method} ${url} - ${status} - ${exception.message}`,
        exception.stack,
        {
          ip,
          userAgent,
        },
      );
    } else {
      this.logger.error(
        `${method} ${url} - ${status} - Unknown exception`,
        { exception, ip, userAgent },
      );
    }
  }
}

@Catch(BaseError)
export class CustomExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CustomExceptionFilter.name);

  catch(exception: BaseError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const errorResponse = exception.getResponse();

    // Log custom errors
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${exception.code}: ${exception.message}`,
      exception.stack,
      {
        ip: request.ip,
        userAgent: request.get('User-Agent'),
        details: exception.details,
      },
    );

    response.status(status).json({
      ...errorResponse,
      path: request.url,
      method: request.method,
    });
  }
}