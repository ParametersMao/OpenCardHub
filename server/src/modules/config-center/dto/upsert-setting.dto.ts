import {
  Allow,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CONFIG_SCOPE_TYPES, type ConfigScopeType } from '../config-center.types';

export class UpsertSettingDto {
  @IsIn(CONFIG_SCOPE_TYPES)
  scopeType!: ConfigScopeType;

  @IsOptional()
  @IsString()
  scopeId?: string;

  @IsString()
  @MaxLength(64)
  group!: string;

  @IsString()
  @MaxLength(96)
  key!: string;

  @Allow()
  value!: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  type?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
