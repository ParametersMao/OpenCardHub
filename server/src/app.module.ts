import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { CapabilityModule } from './modules/capability/capability.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ConfigCenterModule } from './modules/config-center/config-center.module';
import { DatabaseModule } from './modules/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrderModule } from './modules/order/order.module';
import { PaymentModule } from './modules/payment/payment.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { SiteModule } from './modules/site/site.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    ConfigCenterModule,
    UserModule,
    CapabilityModule,
    CatalogModule,
    InventoryModule,
    OrderModule,
    PaymentModule,
    PricingModule,
    SiteModule,
    StorefrontModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
