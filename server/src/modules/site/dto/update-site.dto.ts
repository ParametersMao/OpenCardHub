import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const SITE_STATUSES = ['pending', 'active', 'suspended', 'expired', 'banned'] as const;

type SiteStatus = (typeof SITE_STATUSES)[number];

export class UpdateSiteDto {
  @IsOptional()
  @IsString()
  @MaxLength(96)
  name?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsIn(SITE_STATUSES)
  status?: SiteStatus;

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
