import { IsString } from 'class-validator';

export class MockPayOrderDto {
  @IsString()
  orderNo!: string;
}
