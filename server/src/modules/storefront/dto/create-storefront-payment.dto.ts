import { IsOptional, IsString } from 'class-validator';

export class CreateStorefrontPaymentDto {
  @IsString()
  orderNo!: string;

  @IsOptional()
  @IsString()
  buyerContact?: string;
}
