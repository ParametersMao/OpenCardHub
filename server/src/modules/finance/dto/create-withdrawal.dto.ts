import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateWithdrawalDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsIn(['alipay', 'bank', 'wechat'])
  accountType!: 'alipay' | 'bank' | 'wechat';

  @IsString()
  @MaxLength(96)
  accountName!: string;

  @IsString()
  @MaxLength(128)
  accountNo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}
