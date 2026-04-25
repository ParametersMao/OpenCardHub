import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewWithdrawalDto {
  @IsIn(['approved', 'rejected', 'paid'])
  status!: 'approved' | 'rejected' | 'paid';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reviewRemark?: string;
}
