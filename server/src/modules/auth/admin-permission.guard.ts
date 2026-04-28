import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from './auth.types';
import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
} from './admin-permissions';
import { ADMIN_PERMISSION_METADATA_KEY } from './require-admin-permission.decorator';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<AdminPermission[]>(
        ADMIN_PERMISSION_METADATA_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Admin permission required.');
    }

    const userId = BigInt(user.id);
    const configuredAdminPermissionCount = await this.prisma.userCapability.count({
      where: {
        userId,
        capabilityKey: {
          startsWith: 'admin.',
        },
      },
    });

    // Backward-compatible rollout: legacy admins keep full access until explicitly configured.
    if (configuredAdminPermissionCount === 0) {
      return true;
    }

    const allowedPermissions = await this.prisma.userCapability.findMany({
      where: {
        userId,
        enabled: true,
        capabilityKey: {
          in: [ADMIN_PERMISSIONS.fullAccess, ...requiredPermissions],
        },
        OR: [
          {
            expiredAt: null,
          },
          {
            expiredAt: {
              gt: new Date(),
            },
          },
        ],
      },
      select: {
        capabilityKey: true,
      },
    });
    const allowedPermissionKeys = new Set(
      allowedPermissions.map((permission) => permission.capabilityKey),
    );

    if (allowedPermissionKeys.has(ADMIN_PERMISSIONS.fullAccess)) {
      return true;
    }

    if (
      requiredPermissions.some((permission) =>
        allowedPermissionKeys.has(permission),
      )
    ) {
      return true;
    }

    throw new ForbiddenException('Insufficient admin permission.');
  }
}
