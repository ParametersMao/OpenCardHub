import { IsOptional, IsString } from 'class-validator';

export class QueryStorefrontOrderDto {
  @IsString()
  orderNo!: string;

  @IsOptional()
  @IsString()
  buyerContact?: string;
}
