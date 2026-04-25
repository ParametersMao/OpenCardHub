import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSiteDto {
  @IsString()
  ownerUserId!: string;

  @IsString()
  @MaxLength(96)
  name!: string;

  @IsOptional()
  @IsString()
  systemSubdomain?: string;
}
