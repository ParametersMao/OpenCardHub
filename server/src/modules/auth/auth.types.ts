import type { UserRole } from '@prisma/client';
import type { LevelCode } from '../capability/capability.constants';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  levelCode: LevelCode;
}

export interface AuthTokenPayload {
  sub: string;
  username: string;
  role: UserRole;
  levelCode: LevelCode;
}
