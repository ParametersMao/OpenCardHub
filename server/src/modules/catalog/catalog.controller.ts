import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPermissionGuard } from '../auth/admin-permission.guard';
import { ADMIN_PERMISSIONS } from '../auth/admin-permissions';
import { RequireAdminPermission } from '../auth/require-admin-permission.decorator';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpsertSiteProductDto } from './dto/upsert-site-product.dto';

@UseGuards(AdminGuard, AdminPermissionGuard)
@RequireAdminPermission(ADMIN_PERMISSIONS.catalogManage)
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

  @Patch('categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Body() input: UpdateCategoryDto,
  ) {
    return this.catalogService.updateCategory(id, input);
  }

  @Get('products')
  listProducts() {
    return this.catalogService.listProducts();
  }

  @Post('products')
  createProduct(@Body() input: CreateProductDto) {
    return this.catalogService.createProduct(input);
  }

  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() input: UpdateProductDto) {
    return this.catalogService.updateProduct(id, input);
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
