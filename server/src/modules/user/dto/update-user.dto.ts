import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  LEVEL_CODES,
  type LevelCode,
} from '../../capability/capability.constants';

const USER_ROLES = ['admin', 'agent', 'buyer'] as const;
const USER_STATUSES = ['active', 'disabled'] as const;

type UserRole = (typeof USER_ROLES)[number];
type UserStatus = (typeof USER_STATUSES)[number];

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsIn(LEVEL_CODES)
  levelCode?: LevelCode;

  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  mobile?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
