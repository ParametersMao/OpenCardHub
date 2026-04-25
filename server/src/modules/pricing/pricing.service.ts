import { Injectable } from '@nestjs/common';
import type {
  PriceResolveResult,
  WholesalePriceInput,
} from './pricing.types';

@Injectable()
export class PricingService {
  resolveWholesalePrice(input: WholesalePriceInput): PriceResolveResult {
    const trace: string[] = [];
    let amount = input.defaultWholesalePrice;
    trace.push('Used platform default wholesale price.');

    if (typeof input.levelDiscountRate === 'number') {
      amount = input.defaultWholesalePrice * input.levelDiscountRate;
      trace.push('Applied level unified discount.');
    }

    if (typeof input.categoryDiscountRate === 'number') {
      amount = input.defaultWholesalePrice * input.categoryDiscountRate;
      trace.push('Applied category-level discount.');
    }

    if (typeof input.productLevelWholesalePrice === 'number') {
      amount = input.productLevelWholesalePrice;
      trace.push('Applied product-level wholesale price.');
    }

    if (amount < input.costPrice) {
      amount = input.costPrice;
      trace.push('Raised wholesale price to cost price lower bound.');
    }

    return {
      amount: Number(amount.toFixed(2)),
      trace,
    };
  }
}
