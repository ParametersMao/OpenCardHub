import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderService } from './order.service';

@UseGuards(AdminGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  listOrders() {
    return this.orderService.listOrders();
  }

  @Post()
  createOrder(@Body() input: CreateOrderDto) {
    return this.orderService.createOrder(input);
  }
}
