import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, type Order, type Product } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import type { AuthUser } from '../auth/auth.types';
import { CAPABILITY_KEYS } from '../capability/capability.constants';
import { PrismaService } from '../database/prisma.service';
import { FinanceService } from '../finance/finance.service';
import type { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeService: FinanceService,
  ) {}

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

      const siteProduct = input.siteId
        ? await tx.siteProduct.findUnique({
            where: {
              siteId_productId: {
                siteId: BigInt(input.siteId),
                productId,
              },
            },
          })
        : undefined;

      if (siteProduct && !siteProduct.isVisible) {
        throw new BadRequestException('Product is hidden on this storefront.');
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

      const unitPrice =
        siteProduct?.customPrice &&
        siteProduct.customPrice.toNumber() >= product.minSalePrice.toNumber()
          ? siteProduct.customPrice
          : siteProduct?.customPrice
            ? product.minSalePrice
            : product.salePrice;
      const totalAmount = unitPrice.mul(quantity);
      const costAmount = product.costPrice.mul(quantity);
      const agentSettlementUnit = input.agentUserId
        ? await this.resolveAgentSettlementUnit(
            tx,
            BigInt(input.agentUserId),
            product,
          )
        : undefined;
      const agentSettlementAmount = agentSettlementUnit?.mul(quantity);
      const agentProfit = agentSettlementAmount
        ? totalAmount.minus(agentSettlementAmount)
        : new Prisma.Decimal(0);
      const platformProfit = agentSettlementAmount
        ? agentSettlementAmount.minus(costAmount)
        : totalAmount.minus(costAmount);

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
          agentProfit,
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

  async listAgentOrders(user: AuthUser) {
    this.assertAgentUser(user);

    const orders = await this.prisma.order.findMany({
      where: {
        agentUserId: BigInt(user.id),
      },
      orderBy: {
        id: 'desc',
      },
      include: {
        product: true,
        site: true,
      },
    });

    return orders.map((order) => ({
      ...this.mapOrder(order, order.product),
      siteName: order.site?.name,
    }));
  }

  async getAgentOrderSummary(user: AuthUser) {
    this.assertAgentUser(user);

    const [allOrders, paidOrders] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          agentUserId: BigInt(user.id),
        },
        _count: {
          _all: true,
        },
        _sum: {
          totalAmount: true,
          agentProfit: true,
          platformProfit: true,
        },
      }),
      this.prisma.order.aggregate({
        where: {
          agentUserId: BigInt(user.id),
          paymentStatus: 'paid',
        },
        _count: {
          _all: true,
        },
        _sum: {
          totalAmount: true,
          agentProfit: true,
          platformProfit: true,
        },
      }),
    ]);

    return {
      totalOrders: allOrders._count._all,
      paidOrders: paidOrders._count._all,
      totalAmount: this.decimalToNumber(allOrders._sum.totalAmount),
      paidAmount: this.decimalToNumber(paidOrders._sum.totalAmount),
      agentProfit: this.decimalToNumber(paidOrders._sum.agentProfit),
      platformProfit: this.decimalToNumber(paidOrders._sum.platformProfit),
    };
  }

  async getPublicOrder(orderNo: string, buyerContact?: string) {
    const order = await this.prisma.order.findUnique({
      where: {
        orderNo,
      },
      include: {
        product: true,
        orderCards: true,
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found.');
    }

    if (buyerContact && order.buyerContact !== buyerContact) {
      throw new BadRequestException('Buyer contact does not match order.');
    }

    return {
      ...this.mapOrder(order, order.product),
      cards:
        order.deliveryStatus === 'delivered'
          ? order.orderCards.map((card) => ({
              id: card.id.toString(),
              content: card.cardContentSnapshot,
            }))
          : [],
    };
  }

  async markOrderPaid(input: {
    orderId: string;
    provider: string;
    paymentNo: string;
    amount: Decimal;
    rawNotify?: Record<string, unknown>;
  }) {
    const orderId = BigInt(input.orderId);
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: {
          id: orderId,
        },
        include: {
          product: true,
        },
      });

      if (!order) {
        throw new BadRequestException('Order not found.');
      }

      if (!order.totalAmount.equals(input.amount)) {
        throw new BadRequestException('Payment amount does not match order amount.');
      }

      const payment = await tx.payment.upsert({
        where: {
          paymentNo: input.paymentNo,
        },
        create: {
          orderId,
          paymentNo: input.paymentNo,
          provider: input.provider,
          amount: input.amount,
          status: 'paid',
          rawNotifyJson: this.toPrismaJson(input.rawNotify),
          paidAt: now,
        },
        update: {
          status: 'paid',
          rawNotifyJson: this.toPrismaJson(input.rawNotify),
          paidAt: now,
        },
      });

      if (order.paymentStatus === 'paid' && order.deliveryStatus === 'delivered') {
        return {
          order,
          payment,
          deliveredCards: await tx.orderCard.findMany({
            where: {
              orderId,
            },
          }),
        };
      }

      const lockedCards = await tx.productCard.findMany({
        where: {
          lockedOrderId: orderId,
          status: 'locked',
        },
        orderBy: {
          id: 'asc',
        },
      });

      if (lockedCards.length < order.quantity) {
        throw new BadRequestException('Locked inventory is incomplete.');
      }

      for (const card of lockedCards) {
        await tx.orderCard.upsert({
          where: {
            orderId_productCardId: {
              orderId,
              productCardId: card.id,
            },
          },
          create: {
            orderId,
            productCardId: card.id,
            cardContentSnapshot: card.cardContent,
          },
          update: {
            cardContentSnapshot: card.cardContent,
          },
        });
      }

      await tx.productCard.updateMany({
        where: {
          id: {
            in: lockedCards.map((card) => card.id),
          },
          status: 'locked',
        },
        data: {
          status: 'sold',
          soldOrderId: orderId,
          soldAt: now,
        },
      });

      const updatedOrder = await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          paymentStatus: 'paid',
          deliveryStatus: 'delivered',
          orderStatus: 'completed',
          paymentMethod: input.provider,
          paidAt: now,
          deliveredAt: now,
        },
        include: {
          product: true,
        },
      });

      return {
        order: updatedOrder,
        payment,
        deliveredCards: await tx.orderCard.findMany({
          where: {
            orderId,
          },
        }),
      };
    });

    if (result.order.agentUserId && result.order.agentProfit.gt(0)) {
      await this.financeService.creditOrderProfit({
        userId: result.order.agentUserId,
        orderNo: result.order.orderNo,
        amount: result.order.agentProfit,
        metadata: {
          orderId: result.order.id.toString(),
          productId: result.order.productId.toString(),
        },
      });
    }

    return {
      ...this.mapOrder(result.order, result.order.product),
      paymentId: result.payment.id.toString(),
      deliveredCards: result.deliveredCards.map((card) => ({
        id: card.id.toString(),
        productCardId: card.productCardId.toString(),
        cardContent: card.cardContentSnapshot,
      })),
    };
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

  private async resolveAgentSettlementUnit(
    tx: Prisma.TransactionClient,
    agentUserId: bigint,
    product: Product,
  ) {
    const agent = await tx.user.findUnique({
      where: {
        id: agentUserId,
      },
    });

    if (!agent || agent.status !== 'active') {
      throw new BadRequestException('Agent user is not available.');
    }

    const discountCapability = await tx.levelCapability.findFirst({
      where: {
        capabilityKey: CAPABILITY_KEYS.agentDiscount,
        level: {
          code: agent.levelCode,
        },
      },
    });
    const discountRate = this.readDiscountRate(discountCapability?.configJson);

    if (!discountCapability?.enabled || discountRate <= 0) {
      return product.defaultWholesalePrice;
    }

    return product.defaultWholesalePrice.mul(discountRate);
  }

  private readDiscountRate(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return 1;
    }

    const discountRate = (value as Record<string, unknown>).discountRate;
    return typeof discountRate === 'number' ? discountRate : 1;
  }

  private assertAgentUser(user: AuthUser) {
    if (user.role !== 'agent') {
      throw new BadRequestException('Only agent users can access agent orders.');
    }
  }

  private decimalToNumber(value: Prisma.Decimal | null | undefined) {
    return value?.toNumber() ?? 0;
  }

  private toPrismaJson(
    value: Record<string, unknown> | undefined,
  ): Prisma.InputJsonValue | undefined {
    return value as Prisma.InputJsonValue | undefined;
  }
}
