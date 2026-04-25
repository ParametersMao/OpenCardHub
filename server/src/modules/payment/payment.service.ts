import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { OrderService } from '../order/order.service';
import { AlipayProvider } from './providers/alipay.provider';

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

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order is already paid.');
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
      orderId,
      orderNo: order.orderNo,
      amount: order.totalAmount.toNumber(),
      ...payment,
    };
  }

  async handleAlipayCallback(input: Record<string, unknown>) {
    const verified = await this.alipayProvider.verifyCallback(input);

    return this.orderService.markOrderPaid({
      orderId: verified.orderId,
      provider: verified.provider,
      paymentNo: verified.paymentNo,
      amount: verified.amount,
      rawNotify: verified.rawNotify,
    });
  }

  private toPrismaJson(
    value: Record<string, unknown> | undefined,
  ): Prisma.InputJsonValue | undefined {
    return value as Prisma.InputJsonValue | undefined;
  }
}
