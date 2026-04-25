import { BadRequestException, Injectable } from '@nestjs/common';
import type { ProductCard } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { ImportCardsDto } from './dto/import-cards.dto';
import type { LockCardsDto } from './dto/lock-cards.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async importCards(input: ImportCardsDto) {
    const productId = BigInt(input.productId);
    const normalizedCards = input.cards
      .map((card) => card.trim())
      .filter((card) => card.length > 0);

    if (normalizedCards.length === 0) {
      throw new BadRequestException('No valid cards to import.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productCard.createMany({
        data: normalizedCards.map((cardContent) => ({
          productId,
          cardContent,
        })),
      });

      await tx.product.update({
        where: {
          id: productId,
        },
        data: {
          stockCount: {
            increment: normalizedCards.length,
          },
        },
      });
    });

    return {
      productId: input.productId,
      imported: normalizedCards.length,
    };
  }

  async listProductCards(productId: string) {
    const cards = await this.prisma.productCard.findMany({
      where: {
        productId: BigInt(productId),
      },
      orderBy: {
        id: 'asc',
      },
    });

    return cards.map((card) => this.mapCard(card));
  }

  async getProductStock(productId: string) {
    const grouped = await this.prisma.productCard.groupBy({
      by: ['status'],
      where: {
        productId: BigInt(productId),
      },
      _count: {
        _all: true,
      },
    });

    return {
      productId,
      counts: grouped.reduce<Record<string, number>>((accumulator, item) => {
        accumulator[item.status] = item._count._all;
        return accumulator;
      }, {}),
    };
  }

  async lockCards(input: LockCardsDto) {
    const productId = BigInt(input.productId);
    const orderId = BigInt(input.orderId);

    const lockedCardIds = await this.prisma.$transaction(async (tx) => {
      const availableCards = await tx.$queryRaw<Array<{ id: bigint }>>`
        SELECT id
        FROM product_cards
        WHERE product_id = ${productId}
          AND status = 'unused'
        ORDER BY id ASC
        LIMIT ${input.quantity}
        FOR UPDATE
      `;

      if (availableCards.length < input.quantity) {
        throw new BadRequestException('Insufficient card inventory.');
      }

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
          lockedOrderId: orderId,
          lockedAt: new Date(),
        },
      });

      if (updateResult.count !== input.quantity) {
        throw new BadRequestException('Failed to lock requested inventory.');
      }

      await tx.product.update({
        where: {
          id: productId,
        },
        data: {
          stockCount: {
            decrement: input.quantity,
          },
        },
      });

      return availableCardIds;
    });

    return {
      productId: input.productId,
      orderId: input.orderId,
      locked: lockedCardIds.map((id) => id.toString()),
    };
  }

  private mapCard(card: ProductCard) {
    return {
      id: card.id.toString(),
      productId: card.productId.toString(),
      status: card.status,
      lockedOrderId: card.lockedOrderId?.toString(),
      soldOrderId: card.soldOrderId?.toString(),
      lockedAt: card.lockedAt,
      soldAt: card.soldAt,
      createdAt: card.createdAt,
    };
  }
}
