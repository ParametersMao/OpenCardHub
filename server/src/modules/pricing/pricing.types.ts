import type { LevelCode } from '../capability/capability.constants';

export interface WholesalePriceInput {
  level: LevelCode;
  costPrice: number;
  defaultWholesalePrice: number;
  levelDiscountRate?: number;
  categoryDiscountRate?: number;
  productLevelWholesalePrice?: number;
}

export interface PriceResolveResult {
  amount: number;
  trace: string[];
}
