import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMySiteDto {
  @IsString()
  @MaxLength(96)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  systemSubdomain?: string;
}
