import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderService } from './order.service';

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
