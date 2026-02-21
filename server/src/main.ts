import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
import { AppModule } from './app.module';

/**
 * Custom Socket.IO adapter with production-tuned ping/timeout settings.
 *
 * Defaults are optimised for browser demos, not mobile games:
 *   pingInterval: 25s → 10s  (faster disconnect detection)
 *   pingTimeout:  20s → 5s   (quicker dead-socket cleanup)
 *   maxHttpBufferSize: 1MB → 100KB (game messages are small; reject oversized payloads)
 */
class TuningIoAdapter extends IoAdapter {
  override createIOServer(port: number, options?: ServerOptions): any {
    return super.createIOServer(port, {
      ...options,
      pingInterval: 10_000,
      pingTimeout: 5_000,
      maxHttpBufferSize: 1e5,
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // WebSocket support (Socket.IO shares the same HTTP server)
  app.useWebSocketAdapter(new TuningIoAdapter(app));

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Tap of Exile API')
    .setDescription('Backend API for Tap of Exile Telegram game')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Tap of Exile API running on port ${port}`);
}

bootstrap();
