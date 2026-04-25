import { Body, Controller, Post } from '@nestjs/common';
import { IsIn, IsNumber, IsOptional, Min } from 'class-validator';
import { LEVEL_CODES, type LevelCode } from '../capability/capability.constants';
import { PricingService } from './pricing.service';

class ResolveWholesalePriceDto {
  @IsIn(LEVEL_CODES)
  level!: LevelCode;

  @IsNumber()
  @Min(0)
  costPrice!: number;

  @IsNumber()
  @Min(0)
  defaultWholesalePrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  levelDiscountRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  categoryDiscountRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  productLevelWholesalePrice?: number;
}

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('wholesale/resolve')
  resolveWholesalePrice(@Body() input: ResolveWholesalePriceDto) {
    return this.pricingService.resolveWholesalePrice(input);
  }
}
