import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CONFIG_SCOPE_TYPES,
  type ConfigScopeType,
} from '../config-center.types';

class ResolveScopeDto {
  @IsIn(CONFIG_SCOPE_TYPES)
  type!: ConfigScopeType;

  @IsOptional()
  @IsString()
  id?: string;
}

export class ResolveSettingDto {
  @IsString()
  @MaxLength(64)
  group!: string;

  @IsString()
  @MaxLength(96)
  key!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResolveScopeDto)
  scopes!: ResolveScopeDto[];
}
