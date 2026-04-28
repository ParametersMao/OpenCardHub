import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const;

export class ApprovalQueryDto {
  @IsOptional()
  @IsIn(APPROVAL_STATUSES)
  status?: (typeof APPROVAL_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  type?: string;
}
