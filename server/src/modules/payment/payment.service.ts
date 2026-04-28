import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { OrderService } from '../order/order.service';
import { AlipayProvider } from './providers/alipay.provider';

type PaymentOrder = Prisma.OrderGetPayload<{
  include: {
    product: true;
  };
}>;

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    private readonly alipayProvider: AlipayProvider,
  ) {}

  async createAlipayPayment(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: BigInt(orderId),
      },
      include: {
        product: true,
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found.');
    }

    return this.createAlipayPaymentForOrder(order);
  }

  async createAlipayPaymentByOrderNo(orderNo: string, buyerContact?: string) {
    const order = await this.prisma.order.findUnique({
      where: {
        orderNo,
      },
      include: {
        product: true,
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found.');
    }

    if (buyerContact && order.buyerContact !== buyerContact) {
      throw new BadRequestException('Buyer contact does not match order.');
    }

    return this.createAlipayPaymentForOrder(order);
  }

  private async createAlipayPaymentForOrder(order: PaymentOrder) {
    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order is already paid.');
    }

    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        orderId: order.id,
        provider: 'alipay',
        status: 'pending',
      },
      orderBy: {
        id: 'desc',
      },
    });

    if (existingPayment) {
      const rawPayload = this.asRecord(existingPayment.rawNotifyJson);
      return {
        orderId: order.id.toString(),
        orderNo: order.orderNo,
        amount: order.totalAmount.toNumber(),
        provider: existingPayment.provider,
        paymentNo: existingPayment.paymentNo,
        payUrl: this.readString(rawPayload, 'payUrl'),
        rawPayload,
      };
    }

    const payment = await this.alipayProvider.createPayment({
      orderNo: order.orderNo,
      amount: order.totalAmount,
      subject: order.product.name,
    });

    await this.prisma.payment.upsert({
      where: {
        paymentNo: payment.paymentNo,
      },
      create: {
        orderId: order.id,
        paymentNo: payment.paymentNo,
        provider: payment.provider,
        amount: order.totalAmount,
        status: 'pending',
        rawNotifyJson: this.toPrismaJson(payment.rawPayload),
      },
      update: {
        rawNotifyJson: this.toPrismaJson(payment.rawPayload),
      },
    });

    return {
      orderId: order.id.toString(),
      orderNo: order.orderNo,
      amount: order.totalAmount.toNumber(),
      ...payment,
    };
  }

  async handleAlipayCallback(input: Record<string, unknown>) {
    try {
      const verified = await this.alipayProvider.verifyCallback(input);
      const order = await this.prisma.order.findUnique({
        where: {
          orderNo: verified.orderNo,
        },
      });

      if (!order) {
        throw new BadRequestException('Order not found.');
      }

      await this.createNotifyLog({
        provider: verified.provider,
        paymentNo: verified.paymentNo,
        orderNo: verified.orderNo,
        status: 'verified',
        verified: true,
        rawNotify: verified.rawNotify,
      });

      const result = await this.orderService.markOrderPaid({
        orderId: order.id.toString(),
        provider: verified.provider,
        paymentNo: verified.paymentNo,
        amount: verified.amount,
        rawNotify: verified.rawNotify,
      });

      await this.createNotifyLog({
        provider: verified.provider,
        paymentNo: verified.paymentNo,
        orderNo: verified.orderNo,
        status: 'processed',
        verified: true,
        rawNotify: verified.rawNotify,
      });

      return result;
    } catch (error) {
      await this.createNotifyLog({
        provider: 'alipay',
        paymentNo:
          this.readString(input, 'trade_no') ?? this.readString(input, 'paymentNo'),
        orderNo:
          this.readString(input, 'out_trade_no') ?? this.readString(input, 'orderNo'),
        status: 'failed',
        verified: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown callback error.',
        rawNotify: input,
      });
      throw error;
    }
  }

  private async createNotifyLog(input: {
    provider: string;
    paymentNo?: string;
    orderNo?: string;
    status: string;
    verified: boolean;
    errorMessage?: string;
    rawNotify: Record<string, unknown>;
  }) {
    await this.prisma.paymentNotifyLog.create({
      data: {
        provider: input.provider,
        paymentNo: input.paymentNo,
        orderNo: input.orderNo,
        status: input.status,
        verified: input.verified,
        errorMessage: input.errorMessage?.slice(0, 255),
        rawNotifyJson: input.rawNotify as Prisma.InputJsonValue,
      },
    });
  }

  private toPrismaJson(
    value: Record<string, unknown> | undefined,
  ): Prisma.InputJsonValue | undefined {
    return value as Prisma.InputJsonValue | undefined;
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return undefined;
  }

  private readString(value: Record<string, unknown> | undefined, key: string) {
    const item = value?.[key];
    return typeof item === 'string' ? item : undefined;
  }
}
