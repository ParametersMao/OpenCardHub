import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateLevelCapabilityDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  limitValue?: number;
}
