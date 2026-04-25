import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  categoryId!: string;

  @IsString()
  @MaxLength(128)
  name!: string;

  @IsOptional()
  @IsString()
  cover?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  costPrice!: number;

  @IsNumber()
  @Min(0)
  defaultWholesalePrice!: number;

  @IsNumber()
  @Min(0)
  salePrice!: number;

  @IsNumber()
  @Min(0)
  minSalePrice!: number;

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
}
