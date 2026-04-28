import { SetMetadata } from '@nestjs/common';
import type { AdminPermission } from './admin-permissions';

export const ADMIN_PERMISSION_METADATA_KEY = 'admin_permissions';

export const RequireAdminPermission = (...permissions: AdminPermission[]) =>
  SetMetadata(ADMIN_PERMISSION_METADATA_KEY, permissions);
