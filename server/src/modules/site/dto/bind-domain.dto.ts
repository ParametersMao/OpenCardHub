import { IsIn, IsString, MaxLength } from 'class-validator';

export class BindDomainDto {
  @IsString()
  siteId!: string;

  @IsString()
  @MaxLength(255)
  domain!: string;

  @IsIn(['system_sub', 'custom'])
  type!: 'system_sub' | 'custom';
}
