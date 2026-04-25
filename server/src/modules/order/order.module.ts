import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { AgentOrderController } from './agent-order.controller';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [FinanceModule],
  controllers: [OrderController, AgentOrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
