import { BadRequestException, Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { CatalogService } from '../catalog/catalog.service';
import { OrderService } from '../order/order.service';
import { PrismaService } from '../database/prisma.service';
import { SiteService } from '../site/site.service';
import type { CreateStorefrontOrderDto } from './dto/create-storefront-order.dto';
import type { MockPayOrderDto } from './dto/mock-pay-order.dto';
import type { QueryStorefrontOrderDto } from './dto/query-storefront-order.dto';

@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteService: SiteService,
    private readonly catalogService: CatalogService,
    private readonly orderService: OrderService,
  ) {}

  async getStorefrontByHost(host: string) {
    const resolved = await this.siteService.resolveSiteEntityByHost(host);
    const products = await this.catalogService.listResolvedSiteProducts(
      resolved.site.id.toString(),
    );

    return {
      host: resolved.host,
      domain: {
        id: resolved.domain.id.toString(),
        domain: resolved.domain.domain,
        type: resolved.domain.type,
      },
      site: {
        id: resolved.site.id.toString(),
        name: resolved.site.name,
        logo: resolved.site.logo,
        seoTitle: resolved.site.seoTitle,
        seoKeywords: resolved.site.seoKeywords,
        seoDescription: resolved.site.seoDescription,
        notice: resolved.site.notice,
      },
      products,
    };
  }

  async createOrderByHost(host: string, input: CreateStorefrontOrderDto) {
    const resolved = await this.siteService.resolveSiteEntityByHost(host);

    return this.orderService.createOrder({
      productId: input.productId,
      quantity: input.quantity,
      buyerContact: input.buyerContact,
      siteId: resolved.site.id.toString(),
      agentUserId: resolved.site.ownerUserId.toString(),
    });
  }

  async queryOrder(input: QueryStorefrontOrderDto) {
    return this.orderService.getPublicOrder(input.orderNo, input.buyerContact);
  }

  async mockPayOrder(input: MockPayOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: {
        orderNo: input.orderNo,
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found.');
    }

    await this.orderService.markOrderPaid({
      orderId: order.id.toString(),
      provider: 'mock_alipay',
      paymentNo: `MOCK${Date.now()}`,
      amount: new Decimal(order.totalAmount),
      rawNotify: {
        orderNo: order.orderNo,
        provider: 'mock_alipay',
      },
    });

    return this.orderService.getPublicOrder(order.orderNo);
  }
}
