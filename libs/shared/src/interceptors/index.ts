// Interceptors for cross-cutting concerns

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('User-Agent') || '';
    const now = Date.now();

    this.logger.log(
      `Incoming Request: ${method} ${url} - ${ip} ${userAgent}`,
    );

    return next
      .handle()
      .pipe(
        tap(() => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const delay = Date.now() - now;

          this.logger.log(
            `Outgoing Response: ${method} ${url} - ${statusCode} - ${delay}ms`,
          );
        }),
      );
  }
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap((data) => {
        // Transform response to consistent format
        if (data && typeof data === 'object' && !data.success) {
          return {
            success: true,
            data,
            timestamp: new Date().toISOString(),
          };
        }
        return data;
      }),
    );
  }
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    // Only cache GET requests
    if (method !== 'GET') {
      return next.handle();
    }

    // Generate cache key
    const cacheKey = `cache:${url}:${JSON.stringify(request.query)}`;

    // Check cache first (simplified - would use actual cache service)
    console.log(`Checking cache for key: ${cacheKey}`);

    return next.handle().pipe(
      tap((data) => {
        // Cache response (simplified)
        console.log(`Caching response for key: ${cacheKey}`);
      }),
    );
  }
}