import type { Decimal } from '@prisma/client/runtime/library';

export interface CreatePaymentInput {
  orderId: string;
}

export interface PaymentProviderCreateInput {
  orderNo: string;
  amount: Decimal;
  subject: string;
}

export interface PaymentProviderCreateResult {
  provider: string;
  paymentNo: string;
  payUrl?: string;
  rawPayload?: Record<string, unknown>;
}

export interface PaymentCallbackResult {
  provider: string;
  paymentNo: string;
  orderId: string;
  amount: Decimal;
  rawNotify: Record<string, unknown>;
}

export interface PaymentProvider {
  createPayment(
    input: PaymentProviderCreateInput,
  ): Promise<PaymentProviderCreateResult>;
  verifyCallback(input: Record<string, unknown>): Promise<PaymentCallbackResult>;
}
