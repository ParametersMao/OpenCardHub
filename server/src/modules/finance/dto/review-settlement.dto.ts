import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewSettlementDto {
  @IsIn(['confirmed', 'archived', 'voided'])
  status!: 'confirmed' | 'archived' | 'voided';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}
