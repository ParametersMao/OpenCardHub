import { Module } from '@nestjs/common';
import { OrderModule } from '../order/order.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { AlipayProvider } from './providers/alipay.provider';

@Module({
  imports: [OrderModule],
  controllers: [PaymentController],
  providers: [PaymentService, AlipayProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
