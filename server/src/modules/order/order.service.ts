import { BadRequestException, Injectable } from '@nestjs/common';
import type { Order, Product } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(input: CreateOrderDto) {
    const productId = BigInt(input.productId);
    const quantity = input.quantity;

    const order = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: {
          id: productId,
        },
      });

      if (!product || product.status !== 'active') {
        throw new BadRequestException('Product is not available.');
      }

      if (!product.allowSiteSale && input.siteId) {
        throw new BadRequestException('Product is not available for storefront sale.');
      }

      const availableCards = await tx.$queryRaw<Array<{ id: bigint }>>`
        SELECT id
        FROM product_cards
        WHERE product_id = ${productId}
          AND status = 'unused'
        ORDER BY id ASC
        LIMIT ${quantity}
        FOR UPDATE
      `;

      if (availableCards.length < quantity) {
        throw new BadRequestException('Insufficient card inventory.');
      }

      const unitPrice = product.salePrice;
      const totalAmount = unitPrice.mul(quantity);
      const costAmount = product.costPrice.mul(quantity);
      const platformProfit = totalAmount.minus(costAmount);

      const createdOrder = await tx.order.create({
        data: {
          orderNo: this.createOrderNo(),
          siteId: input.siteId ? BigInt(input.siteId) : undefined,
          agentUserId: input.agentUserId ? BigInt(input.agentUserId) : undefined,
          buyerContact: input.buyerContact,
          productId,
          quantity,
          unitPrice,
          totalAmount,
          costAmount,
          platformProfit,
          paymentStatus: 'pending',
          deliveryStatus: 'pending',
          orderStatus: 'pending',
        },
      });

      const availableCardIds = availableCards.map((card) => card.id);
      const updateResult = await tx.productCard.updateMany({
        where: {
          id: {
            in: availableCardIds,
          },
          status: 'unused',
        },
        data: {
          status: 'locked',
          lockedOrderId: createdOrder.id,
          lockedAt: new Date(),
        },
      });

      if (updateResult.count !== quantity) {
        throw new BadRequestException('Failed to lock requested inventory.');
      }

      await tx.product.update({
        where: {
          id: productId,
        },
        data: {
          stockCount: {
            decrement: quantity,
          },
        },
      });

      return {
        order: createdOrder,
        product,
        lockedCardIds: availableCardIds,
      };
    });

    return {
      ...this.mapOrder(order.order, order.product),
      lockedCardIds: order.lockedCardIds.map((id) => id.toString()),
    };
  }

  async listOrders() {
    const orders = await this.prisma.order.findMany({
      orderBy: {
        id: 'desc',
      },
      include: {
        product: true,
      },
    });

    return orders.map((order) => this.mapOrder(order, order.product));
  }

  private mapOrder(order: Order, product?: Product) {
    return {
      id: order.id.toString(),
      orderNo: order.orderNo,
      siteId: order.siteId?.toString(),
      agentUserId: order.agentUserId?.toString(),
      buyerContact: order.buyerContact,
      productId: order.productId.toString(),
      productName: product?.name,
      quantity: order.quantity,
      unitPrice: order.unitPrice.toNumber(),
      totalAmount: order.totalAmount.toNumber(),
      costAmount: order.costAmount.toNumber(),
      agentProfit: order.agentProfit.toNumber(),
      platformProfit: order.platformProfit.toNumber(),
      paymentStatus: order.paymentStatus,
      deliveryStatus: order.deliveryStatus,
      orderStatus: order.orderStatus,
      paidAt: order.paidAt,
      deliveredAt: order.deliveredAt,
      createdAt: order.createdAt,
    };
  }

  private createOrderNo() {
    const random = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');
    return `OC${Date.now()}${random}`;
  }
}
