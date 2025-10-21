// Main application entry point for HOA Community Platform

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@hoa-platform/shared';
import { LoggingInterceptor, TransformInterceptor } from '@hoa-platform/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // CORS configuration
  const corsOrigins = configService.get<string[]>('cors.origin');
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // API prefix
  const apiPrefix = 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('HOA Community Platform API')
    .setDescription('Multi-tenant HOA Community Management Platform API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Authentication')
    .addTag('Users')
    .addTag('Tenants')
    .addTag('Households')
    .addTag('Residences')
    .addTag('Vehicles')
    .addTag('Gate Passes')
    .addTag('Guests')
    .addTag('Construction Permits')
    .addTag('Announcements')
    .addTag('Elections')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start server
  const port = configService.get<number>('app.port');
  const env = configService.get<string>('app.env');

  await app.listen(port, '0.0.0.0');

  console.log(`
🚀 HOA Community Platform API Server Started!
📍 Environment: ${env}
🌐 Server URL: http://localhost:${port}
📚 API Docs: http://localhost:${port}/api/docs
🔍 API Prefix: /${apiPrefix}
  `);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();