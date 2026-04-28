import { createVerify } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import type {
  PaymentCallbackResult,
  PaymentProvider,
  PaymentProviderCreateInput,
  PaymentProviderCreateResult,
} from '../payment.types';

@Injectable()
export class AlipayProvider implements PaymentProvider {
  constructor(private readonly configService: ConfigService) {}

  async createPayment(
    input: PaymentProviderCreateInput,
  ): Promise<PaymentProviderCreateResult> {
    const paymentNo = `ALI${Date.now()}${Math.random()
      .toString()
      .slice(2, 8)}`;
    const mode = this.configService.get<string>('ALIPAY_MODE', 'mock');
    const payUrl =
      mode === 'mock'
        ? `alipay://mock-pay?payment_no=${paymentNo}&amount=${input.amount.toFixed(2)}&order_no=${input.orderNo}`
        : this.createAlipayGatewayUrl(paymentNo, input);

    return {
      provider: 'alipay',
      paymentNo,
      payUrl,
      rawPayload: {
        mode,
        orderNo: input.orderNo,
        paymentNo,
        payUrl,
        amount: input.amount.toFixed(2),
        subject: input.subject,
        returnUrl: input.returnUrl,
        notifyUrl: input.notifyUrl,
      },
    };
  }

  async verifyCallback(
    input: Record<string, unknown>,
  ): Promise<PaymentCallbackResult> {
    this.assertCallbackSignature(input);

    const orderNo =
      this.readString(input, 'out_trade_no') ?? this.readRequiredString(input, 'orderNo');
    const paymentNo =
      this.readString(input, 'trade_no') ?? this.readRequiredString(input, 'paymentNo');
    const amount = new Decimal(
      this.readString(input, 'total_amount') ?? this.readRequiredString(input, 'amount'),
    );
    const tradeStatus = this.readString(input, 'trade_status');

    if (tradeStatus && !['TRADE_SUCCESS', 'TRADE_FINISHED'].includes(tradeStatus)) {
      throw new BadRequestException(`Unsupported Alipay trade status: ${tradeStatus}`);
    }

    return {
      provider: 'alipay',
      paymentNo,
      orderNo,
      amount,
      rawNotify: input,
    };
  }

  private createAlipayGatewayUrl(
    paymentNo: string,
    input: PaymentProviderCreateInput,
  ) {
    const appId = this.configService.get<string>('ALIPAY_APP_ID');
    const gateway = this.configService.get<string>(
      'ALIPAY_GATEWAY_URL',
      'https://openapi.alipay.com/gateway.do',
    );

    if (!appId) {
      throw new BadRequestException('ALIPAY_APP_ID is required when ALIPAY_MODE is not mock.');
    }

    const params = new URLSearchParams({
      app_id: appId,
      method: 'alipay.trade.page.pay',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString(),
      version: '1.0',
      out_trade_no: input.orderNo,
      subject: input.subject,
      total_amount: input.amount.toFixed(2),
      product_code: 'FAST_INSTANT_TRADE_PAY',
      passback_params: paymentNo,
    });

    if (input.returnUrl) {
      params.set('return_url', input.returnUrl);
    }

    if (input.notifyUrl) {
      params.set('notify_url', input.notifyUrl);
    }

    return `${gateway}?${params.toString()}`;
  }

  private assertCallbackSignature(input: Record<string, unknown>) {
    const mode = this.configService.get<string>('ALIPAY_MODE', 'mock');
    const shouldVerify = this.configService.get<string>(
      'ALIPAY_VERIFY_CALLBACK_SIGNATURE',
      mode === 'mock' ? 'false' : 'true',
    );

    if (shouldVerify !== 'true') {
      return;
    }

    const signature = this.readRequiredString(input, 'sign');
    const signType = this.readString(input, 'sign_type') ?? 'RSA2';
    const publicKey = this.configService.get<string>('ALIPAY_PUBLIC_KEY');

    if (!publicKey) {
      throw new BadRequestException('ALIPAY_PUBLIC_KEY is required for callback verification.');
    }

    if (signType !== 'RSA2') {
      throw new BadRequestException(`Unsupported Alipay sign type: ${signType}`);
    }

    const verify = createVerify('RSA-SHA256');
    verify.update(this.createSignContent(input));
    verify.end();

    if (!verify.verify(this.normalizePublicKey(publicKey), signature, 'base64')) {
      throw new BadRequestException('Invalid Alipay callback signature.');
    }
  }

  private createSignContent(input: Record<string, unknown>) {
    return Object.entries(input)
      .filter(([key, value]) => key !== 'sign' && key !== 'sign_type' && value !== undefined)
      .map(([key, value]) => [key, String(value)] as const)
      .filter(([, value]) => value.length > 0)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
  }

  private normalizePublicKey(publicKey: string) {
    if (publicKey.includes('BEGIN PUBLIC KEY')) {
      return publicKey;
    }

    const lines = publicKey.match(/.{1,64}/g)?.join('\n') ?? publicKey;
    return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
  }

  private readRequiredString(
    input: Record<string, unknown>,
    key: string,
  ): string {
    const value = this.readString(input, key);
    if (!value) {
      throw new BadRequestException(`Missing required Alipay callback field: ${key}`);
    }

    return value;
  }

  private readString(input: Record<string, unknown>, key: string) {
    const value = input[key];
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : undefined;
  }
}
