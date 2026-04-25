import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { CapabilityModule } from './modules/capability/capability.module';
import { ConfigCenterModule } from './modules/config-center/config-center.module';
import { DatabaseModule } from './modules/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { PricingModule } from './modules/pricing/pricing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    HealthModule,
    ConfigCenterModule,
    CapabilityModule,
    PricingModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
