import { Injectable } from '@nestjs/common';
import type { Category, Product, SiteProduct } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import type { UpsertSiteProductDto } from './dto/upsert-site-product.dto';

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

  async updateCategory(id: string, input: UpdateCategoryDto) {
    const category = await this.prisma.category.update({
      where: {
        id: BigInt(id),
      },
      data: {
        parentId: input.parentId ? BigInt(input.parentId) : undefined,
        name: input.name,
        sortOrder: input.sortOrder,
        status: input.status,
      },
    });

    return this.mapCategory(category);
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

  async updateProduct(id: string, input: UpdateProductDto) {
    const product = await this.prisma.product.update({
      where: {
        id: BigInt(id),
      },
      data: {
        categoryId: input.categoryId ? BigInt(input.categoryId) : undefined,
        name: input.name,
        cover: input.cover,
        description: input.description,
        costPrice: input.costPrice,
        defaultWholesalePrice: input.defaultWholesalePrice,
        salePrice: input.salePrice,
        minSalePrice: input.minSalePrice,
        allowSiteSale: input.allowSiteSale,
        allowAgentEditPrice: input.allowAgentEditPrice,
        allowAgentEditName: input.allowAgentEditName,
        allowAgentEditDescription: input.allowAgentEditDescription,
        sortOrder: input.sortOrder,
        status: input.status,
      },
      include: {
        category: true,
      },
    });

    return this.mapProduct(product);
  }

  async upsertSiteProduct(input: UpsertSiteProductDto) {
    const siteProduct = await this.prisma.siteProduct.upsert({
      where: {
        siteId_productId: {
          siteId: BigInt(input.siteId),
          productId: BigInt(input.productId),
        },
      },
      create: {
        siteId: BigInt(input.siteId),
        productId: BigInt(input.productId),
        customName: input.customName,
        customDescription: input.customDescription,
        customCover: input.customCover,
        customPrice: input.customPrice,
        isVisible: input.isVisible ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
      update: {
        customName: input.customName,
        customDescription: input.customDescription,
        customCover: input.customCover,
        customPrice: input.customPrice,
        isVisible: input.isVisible ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    return this.mapSiteProduct(siteProduct);
  }

  async listSiteProductOverrides(siteId: string) {
    const siteProducts = await this.prisma.siteProduct.findMany({
      where: {
        siteId: BigInt(siteId),
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    return siteProducts.map((siteProduct) => this.mapSiteProduct(siteProduct));
  }

  async listResolvedSiteProducts(siteId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        status: 'active',
        allowSiteSale: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        category: true,
        siteProducts: {
          where: {
            siteId: BigInt(siteId),
          },
          take: 1,
        },
      },
    });

    return products
      .map((product) => {
        const override = product.siteProducts[0];
        return this.resolveSiteProduct(product, override);
      })
      .filter((product) => product.isVisible)
      .sort((left, right) => left.sortOrder - right.sortOrder);
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

  private mapSiteProduct(
    siteProduct: SiteProduct & { product?: Product & { category?: Category } },
  ) {
    return {
      id: siteProduct.id.toString(),
      siteId: siteProduct.siteId.toString(),
      productId: siteProduct.productId.toString(),
      customName: siteProduct.customName,
      customDescription: siteProduct.customDescription,
      customCover: siteProduct.customCover,
      customPrice: siteProduct.customPrice?.toNumber(),
      isVisible: siteProduct.isVisible,
      sortOrder: siteProduct.sortOrder,
      product: siteProduct.product
        ? this.mapProduct(siteProduct.product)
        : undefined,
    };
  }

  private resolveSiteProduct(
    product: Product & { category?: Category },
    override?: SiteProduct,
  ) {
    const customPrice = override?.customPrice?.toNumber();
    const platformPrice = product.salePrice.toNumber();
    const minSalePrice = product.minSalePrice.toNumber();
    const resolvedPrice =
      typeof customPrice === 'number'
        ? Math.max(customPrice, minSalePrice)
        : platformPrice;

    return {
      id: product.id.toString(),
      categoryId: product.categoryId.toString(),
      category: product.category ? this.mapCategory(product.category) : undefined,
      name: override?.customName ?? product.name,
      cover: override?.customCover ?? product.cover,
      description: override?.customDescription ?? product.description,
      productType: product.productType,
      price: Number(resolvedPrice.toFixed(2)),
      platformPrice,
      minSalePrice,
      stockCount: product.stockCount,
      isVisible: override?.isVisible ?? true,
      sortOrder: override?.sortOrder ?? product.sortOrder,
      override: override ? this.mapSiteProduct(override) : undefined,
    };
  }
}
