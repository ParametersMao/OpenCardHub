import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertSiteProductDto {
  @IsString()
  siteId!: string;

  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  customName?: string;

  @IsOptional()
  @IsString()
  customDescription?: string;

  @IsOptional()
  @IsString()
  customCover?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customPrice?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
