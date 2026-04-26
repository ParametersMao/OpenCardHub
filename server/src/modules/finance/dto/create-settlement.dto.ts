import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateSettlementDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}
