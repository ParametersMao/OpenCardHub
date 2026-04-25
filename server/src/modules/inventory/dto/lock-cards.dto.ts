import { IsInt, IsString, Min } from 'class-validator';

export class LockCardsDto {
  @IsString()
  productId!: string;

  @IsString()
  orderId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
