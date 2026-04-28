import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityConfigService implements OnModuleInit {
  private readonly logger = new Logger(SecurityConfigService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const appEnv = this.configService.get<string>('APP_ENV', 'local');
    const isProduction = nodeEnv === 'production' || appEnv === 'production';

    this.warnForWeakDevelopmentConfig();

    if (!isProduction) {
      return;
    }

    this.assertStrongJwtSecret();
    this.assertCorsWhitelist();
    this.assertPaymentProviderSafety();
  }

  private warnForWeakDevelopmentConfig() {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');

    if (!jwtSecret || this.isDefaultSecret(jwtSecret)) {
      this.logger.warn(
        'JWT_SECRET is using a development value. Set a strong secret before production.',
      );
    }
  }

  private assertStrongJwtSecret() {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');

    if (!jwtSecret || this.isDefaultSecret(jwtSecret) || jwtSecret.length < 32) {
      throw new Error(
        'Production requires JWT_SECRET with at least 32 characters and not a default value.',
      );
    }
  }

  private assertCorsWhitelist() {
    const corsOrigin = this.configService.get<string>('APP_CORS_ORIGIN', '*');

    if (!corsOrigin || corsOrigin === '*') {
      throw new Error('Production requires APP_CORS_ORIGIN to be an explicit whitelist.');
    }
  }

  private assertPaymentProviderSafety() {
    const alipayMode = this.configService.get<string>('ALIPAY_MODE', 'mock');
    const verifyCallbackSignature = this.configService.get<string>(
      'ALIPAY_VERIFY_CALLBACK_SIGNATURE',
      alipayMode === 'mock' ? 'false' : 'true',
    );
    const alipayPublicKey = this.configService.get<string>('ALIPAY_PUBLIC_KEY');

    if (alipayMode !== 'mock' && verifyCallbackSignature !== 'true') {
      throw new Error(
        'Production Alipay requires ALIPAY_VERIFY_CALLBACK_SIGNATURE=true.',
      );
    }

    if (alipayMode !== 'mock' && !alipayPublicKey) {
      throw new Error('Production Alipay requires ALIPAY_PUBLIC_KEY.');
    }
  }

  private isDefaultSecret(value: string) {
    return ['change-me-in-production', 'opencardhub-dev-secret'].includes(value);
  }
}
