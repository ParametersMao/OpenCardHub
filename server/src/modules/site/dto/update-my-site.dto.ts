import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMySiteDto {
  @IsOptional()
  @IsString()
  @MaxLength(96)
  name?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoKeywords?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoDescription?: string;

  @IsOptional()
  @IsString()
  notice?: string;
}
