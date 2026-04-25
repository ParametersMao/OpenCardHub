import { Injectable } from '@nestjs/common';
import type { Category, Product } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(input: CreateCategoryDto) {
    const category = await this.prisma.category.create({
      data: {
        name: input.name,
        parentId: input.parentId ? BigInt(input.parentId) : undefined,
      },
    });

    return this.mapCategory(category);
  }

  async listCategories() {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return categories.map((category) => this.mapCategory(category));
  }

  async createProduct(input: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        categoryId: BigInt(input.categoryId),
        name: input.name,
        cover: input.cover,
        description: input.description,
        costPrice: input.costPrice,
        defaultWholesalePrice: input.defaultWholesalePrice,
        salePrice: input.salePrice,
        minSalePrice: input.minSalePrice,
        allowSiteSale: input.allowSiteSale ?? true,
        allowAgentEditPrice: input.allowAgentEditPrice ?? false,
        allowAgentEditName: input.allowAgentEditName ?? false,
        allowAgentEditDescription: input.allowAgentEditDescription ?? false,
        status: 'active',
      },
      include: {
        category: true,
      },
    });

    return this.mapProduct(product);
  }

  async listProducts() {
    const products = await this.prisma.product.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        category: true,
      },
    });

    return products.map((product) => this.mapProduct(product));
  }

  private mapCategory(category: Category) {
    return {
      id: category.id.toString(),
      parentId: category.parentId?.toString(),
      name: category.name,
      sortOrder: category.sortOrder,
      status: category.status,
    };
  }

  private mapProduct(product: Product & { category?: Category }) {
    return {
      id: product.id.toString(),
      categoryId: product.categoryId.toString(),
      category: product.category ? this.mapCategory(product.category) : undefined,
      name: product.name,
      cover: product.cover,
      description: product.description,
      productType: product.productType,
      costPrice: product.costPrice.toNumber(),
      defaultWholesalePrice: product.defaultWholesalePrice.toNumber(),
      salePrice: product.salePrice.toNumber(),
      minSalePrice: product.minSalePrice.toNumber(),
      stockCount: product.stockCount,
      allowSiteSale: product.allowSiteSale,
      allowAgentEditPrice: product.allowAgentEditPrice,
      allowAgentEditName: product.allowAgentEditName,
      allowAgentEditDescription: product.allowAgentEditDescription,
      status: product.status,
      sortOrder: product.sortOrder,
    };
  }
}
