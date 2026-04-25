import { Controller, Get, Headers, Query } from '@nestjs/common';
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
}
