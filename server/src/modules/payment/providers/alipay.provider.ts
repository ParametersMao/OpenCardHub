import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import type {
  PaymentCallbackResult,
  PaymentProvider,
  PaymentProviderCreateInput,
  PaymentProviderCreateResult,
} from '../payment.types';

@Injectable()
export class AlipayProvider implements PaymentProvider {
  async createPayment(
    input: PaymentProviderCreateInput,
  ): Promise<PaymentProviderCreateResult> {
    const paymentNo = `ALI${Date.now()}${Math.random()
      .toString()
      .slice(2, 8)}`;

    return {
      provider: 'alipay',
      paymentNo,
      payUrl: `alipay://mock-pay?payment_no=${paymentNo}&amount=${input.amount.toFixed(2)}`,
      rawPayload: {
        orderNo: input.orderNo,
        amount: input.amount.toFixed(2),
        subject: input.subject,
      },
    };
  }

  async verifyCallback(
    input: Record<string, unknown>,
  ): Promise<PaymentCallbackResult> {
    const orderId = this.readRequiredString(input, 'orderId');
    const paymentNo = this.readRequiredString(input, 'paymentNo');
    const amount = new Decimal(this.readRequiredString(input, 'amount'));

    return {
      provider: 'alipay',
      paymentNo,
      orderId,
      amount,
      rawNotify: input,
    };
  }

  private readRequiredString(
    input: Record<string, unknown>,
    key: string,
  ): string {
    const value = input[key];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Missing required Alipay callback field: ${key}`);
    }

    return value;
  }
}
