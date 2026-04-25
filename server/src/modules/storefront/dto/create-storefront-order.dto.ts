import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateStorefrontOrderDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  buyerContact?: string;
}
