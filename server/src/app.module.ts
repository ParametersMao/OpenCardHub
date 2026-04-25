import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { CapabilityModule } from './modules/capability/capability.module';
import { HealthModule } from './modules/health/health.module';
import { PricingModule } from './modules/pricing/pricing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    CapabilityModule,
    PricingModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
