import { Module } from '@nestjs/common';
import { AgentOrderController } from './agent-order.controller';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  controllers: [OrderController, AgentOrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
