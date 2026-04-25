import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  LEVEL_CODES,
  type LevelCode,
} from '../../capability/capability.constants';

const USER_ROLES = ['admin', 'agent', 'buyer'] as const;
type UserRole = (typeof USER_ROLES)[number];

export class CreateUserDto {
  @IsString()
  @MaxLength(64)
  username!: string;

  @IsString()
  @MaxLength(128)
  password!: string;

  @IsIn(LEVEL_CODES)
  levelCode!: LevelCode;

  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  mobile?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
