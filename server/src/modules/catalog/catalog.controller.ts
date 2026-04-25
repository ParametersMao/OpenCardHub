import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpsertSiteProductDto } from './dto/upsert-site-product.dto';

@UseGuards(AdminGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  listCategories() {
    return this.catalogService.listCategories();
  }

  @Post('categories')
  createCategory(@Body() input: CreateCategoryDto) {
    return this.catalogService.createCategory(input);
  }

  @Get('products')
  listProducts() {
    return this.catalogService.listProducts();
  }

  @Post('products')
  createProduct(@Body() input: CreateProductDto) {
    return this.catalogService.createProduct(input);
  }

  @Get('sites/:siteId/products')
  listResolvedSiteProducts(@Param('siteId') siteId: string) {
    return this.catalogService.listResolvedSiteProducts(siteId);
  }

  @Get('sites/:siteId/overrides')
  listSiteProductOverrides(@Param('siteId') siteId: string) {
    return this.catalogService.listSiteProductOverrides(siteId);
  }

  @Post('site-products')
  upsertSiteProduct(@Body() input: UpsertSiteProductDto) {
    return this.catalogService.upsertSiteProduct(input);
  }
}
