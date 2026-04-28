import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>('APP_PORT', 3000);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: resolveCorsOrigin(config),
    credentials: config.get<string>('APP_CORS_CREDENTIALS', 'true') === 'true',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter(config));

  await app.listen(port);
}

function resolveCorsOrigin(config: ConfigService) {
  const origin = config.get<string>('APP_CORS_ORIGIN', '*');
  if (origin === '*') {
    return true;
  }

  const allowList = origin
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return (requestOrigin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (!requestOrigin || allowList.includes(requestOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS.'), false);
  };
}

void bootstrap();
