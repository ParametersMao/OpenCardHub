import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ImportCardsDto {
  @IsString()
  productId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  cards!: string[];
}
