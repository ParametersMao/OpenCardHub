import { IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

const CATEGORY_STATUSES = ['draft', 'active', 'hidden', 'disabled'] as const;

type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(96)
  name?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsIn(CATEGORY_STATUSES)
  status?: CategoryStatus;
}
