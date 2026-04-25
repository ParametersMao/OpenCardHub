import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { SiteModule } from '../site/site.module';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';

@Module({
  imports: [SiteModule, CatalogModule],
  controllers: [StorefrontController],
  providers: [StorefrontService],
})
export class StorefrontModule {}
