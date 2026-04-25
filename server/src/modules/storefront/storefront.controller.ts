import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { CreateStorefrontOrderDto } from './dto/create-storefront-order.dto';
import { MockPayOrderDto } from './dto/mock-pay-order.dto';
import { QueryStorefrontOrderDto } from './dto/query-storefront-order.dto';
import { StorefrontService } from './storefront.service';

@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get()
  getStorefront(
    @Query('host') queryHost?: string,
    @Headers('host') headerHost?: string,
  ) {
    return this.storefrontService.getStorefrontByHost(
      queryHost ?? headerHost ?? '',
    );
  }

  @Post('orders')
  createOrder(
    @Body() input: CreateStorefrontOrderDto,
    @Query('host') queryHost?: string,
    @Headers('host') headerHost?: string,
  ) {
    return this.storefrontService.createOrderByHost(
      queryHost ?? headerHost ?? '',
      input,
    );
  }

  @Post('orders/query')
  queryOrder(@Body() input: QueryStorefrontOrderDto) {
    return this.storefrontService.queryOrder(input);
  }

  @Post('orders/mock-pay')
  mockPayOrder(@Body() input: MockPayOrderDto) {
    return this.storefrontService.mockPayOrder(input);
  }
}
