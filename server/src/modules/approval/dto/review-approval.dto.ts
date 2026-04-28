import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewApprovalDto {
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reviewRemark?: string;
}
