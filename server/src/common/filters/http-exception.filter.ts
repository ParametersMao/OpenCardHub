import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface HttpRequestLike {
  url: string;
}

interface HttpResponseLike {
  status(code: number): {
    json(body: unknown): void;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponseLike>();
    const request = context.getRequest<HttpRequestLike>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const isProduction = this.isProduction();

    response.status(status).json({
      statusCode: status,
      message: this.resolveMessage(exception, isProduction),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolveMessage(exception: unknown, isProduction: boolean) {
    if (!(exception instanceof HttpException)) {
      return isProduction ? 'Internal server error.' : this.stringifyError(exception);
    }

    const response = exception.getResponse();
    if (typeof response === 'string') {
      return response;
    }

    if (!response || typeof response !== 'object') {
      return exception.message;
    }

    const payload = response as { message?: unknown };
    return payload.message ?? exception.message;
  }

  private stringifyError(exception: unknown) {
    return exception instanceof Error ? exception.message : 'Internal server error.';
  }

  private isProduction() {
    return (
      this.configService.get<string>('NODE_ENV') === 'production' ||
      this.configService.get<string>('APP_ENV') === 'production'
    );
  }
}
