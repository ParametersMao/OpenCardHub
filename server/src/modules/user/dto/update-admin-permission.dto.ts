import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAdminPermissionDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}
