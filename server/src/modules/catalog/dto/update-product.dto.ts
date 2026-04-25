import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const PRODUCT_STATUSES = ['draft', 'active', 'hidden', 'disabled'] as const;

type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  cover?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultWholesalePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minSalePrice?: number;

  @IsOptional()
  @IsBoolean()
  allowSiteSale?: boolean;

  @IsOptional()
  @IsBoolean()
  allowAgentEditPrice?: boolean;

  @IsOptional()
  @IsBoolean()
  allowAgentEditName?: boolean;

  @IsOptional()
  @IsBoolean()
  allowAgentEditDescription?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsIn(PRODUCT_STATUSES)
  status?: ProductStatus;
}
