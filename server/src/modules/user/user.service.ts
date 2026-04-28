import {
  createHash,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type User } from '@prisma/client';
import {
  ADMIN_PERMISSION_OPTIONS,
  ADMIN_PERMISSIONS,
  type AdminPermission,
} from '../auth/admin-permissions';
import type { AuthUser } from '../auth/auth.types';
import { ApprovalService } from '../approval/approval.service';
import { PrismaService } from '../database/prisma.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateAdminPermissionDto } from './dto/update-admin-permission.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

interface UserAuditContext {
  operator?: AuthUser;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class UserService {
  private readonly passwordHashPrefix = 'pbkdf2';

  constructor(
    private readonly approvalService: ApprovalService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async createUser(input: CreateUserDto) {
    this.assertUsername(input.username);
    this.assertPasswordPolicy(input.password);

    const user = await this.prisma.user.create({
      data: {
        username: input.username.trim(),
        passwordHash: this.hashPassword(input.password),
        role: input.role ?? (input.levelCode === 'V0' ? 'buyer' : 'agent'),
        levelCode: input.levelCode,
        mobile: input.mobile,
        email: input.email,
      },
    });

    return this.mapUser(user);
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: {
        id: 'desc',
      },
    });

    return users.map((user) => this.mapUser(user));
  }

  listAdminPermissionOptions() {
    return ADMIN_PERMISSION_OPTIONS;
  }

  async listAdminPermissions(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: BigInt(id),
      },
      include: {
        capabilities: {
          where: {
            capabilityKey: {
              startsWith: 'admin.',
            },
          },
          orderBy: {
            capabilityKey: 'asc',
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return {
      user: this.mapUser(user),
      legacyFullAccess: user.capabilities.length === 0,
      permissions: ADMIN_PERMISSION_OPTIONS.map((option) => {
        const configuredPermission = user.capabilities.find(
          (capability) => capability.capabilityKey === option.key,
        );

        return {
          ...option,
          configured: Boolean(configuredPermission),
          enabled: configuredPermission?.enabled ?? false,
          expiredAt: configuredPermission?.expiredAt,
        };
      }),
    };
  }

  async getEffectiveAdminPermissions(user: AuthUser) {
    if (user.role !== 'admin') {
      return {
        legacyFullAccess: false,
        effectivePermissions: [],
        permissions: [],
      };
    }

    const configuredPermissions = await this.prisma.userCapability.findMany({
      where: {
        userId: BigInt(user.id),
        capabilityKey: {
          startsWith: 'admin.',
        },
      },
      orderBy: {
        capabilityKey: 'asc',
      },
    });
    const enabledPermissions = configuredPermissions.filter(
      (permission) =>
        permission.enabled &&
        (!permission.expiredAt || permission.expiredAt > new Date()),
    );
    const enabledPermissionKeys = new Set(
      enabledPermissions.map((permission) => permission.capabilityKey),
    );
    const legacyFullAccess = configuredPermissions.length === 0;
    const hasFullAccess =
      legacyFullAccess || enabledPermissionKeys.has(ADMIN_PERMISSIONS.fullAccess);
    const effectivePermissions = hasFullAccess
      ? ADMIN_PERMISSION_OPTIONS.map((option) => option.key)
      : ADMIN_PERMISSION_OPTIONS.filter((option) =>
          enabledPermissionKeys.has(option.key),
        ).map((option) => option.key);

    return {
      legacyFullAccess,
      effectivePermissions,
      permissions: ADMIN_PERMISSION_OPTIONS.map((option) => {
        const configuredPermission = configuredPermissions.find(
          (permission) => permission.capabilityKey === option.key,
        );

        return {
          ...option,
          configured: Boolean(configuredPermission),
          enabled: hasFullAccess || Boolean(configuredPermission?.enabled),
          expiredAt: configuredPermission?.expiredAt,
        };
      }),
    };
  }

  async updateAdminPermission(
    id: string,
    permission: string,
    input: UpdateAdminPermissionDto,
    audit?: UserAuditContext,
  ) {
    this.assertAdminPermissionKey(permission);
    const permissionKey = permission as AdminPermission;
    const userId = BigInt(id);
    const targetUser = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    if (targetUser.role !== 'admin') {
      throw new BadRequestException('Admin permissions can only be assigned to admin users.');
    }

    this.assertSelfPermissionSafety(targetUser, permissionKey, input, audit);

    if (this.approvalService.isAdminPermissionApprovalRequired()) {
      return {
        approvalRequired: true,
        approval: await this.approvalService.createApprovalRequest(
          {
            type: 'admin_permission_update',
            action: 'user.admin_permission.update',
            targetType: 'user',
            targetId: targetUser.id,
            payload: {
              userId: targetUser.id.toString(),
              permission: permissionKey,
              enabled: input.enabled,
              remark: input.remark,
            },
            remark: input.remark,
          },
          audit,
        ),
      };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const existingPermission = await tx.userCapability.findUnique({
        where: {
          userId_capabilityKey: {
            userId,
            capabilityKey: permissionKey,
          },
        },
      });

      const updatedPermission = await tx.userCapability.upsert({
        where: {
          userId_capabilityKey: {
            userId,
            capabilityKey: permissionKey,
          },
        },
        create: {
          userId,
          capabilityKey: permissionKey,
          enabled: input.enabled,
          configJson: this.toOptionalPrismaJson({ remark: input.remark }),
        },
        update: {
          enabled: input.enabled,
          configJson: this.toOptionalPrismaJson({ remark: input.remark }),
        },
      });

      await tx.operationLog.create({
        data: {
          userId: audit?.operator ? BigInt(audit.operator.id) : undefined,
          action: 'user.admin_permission.update',
          targetType: 'user',
          targetId: targetUser.id,
          ip: audit?.ip,
          detailJson: this.toPrismaJson({
            permission: permissionKey,
            before: existingPermission
              ? {
                  enabled: existingPermission.enabled,
                  expiredAt: existingPermission.expiredAt,
                }
              : undefined,
            after: {
              enabled: updatedPermission.enabled,
              expiredAt: updatedPermission.expiredAt,
            },
            remark: input.remark,
            operator: audit?.operator?.username,
            userAgent: audit?.userAgent,
          }),
        },
      });

      return updatedPermission;
    });

    return {
      key: result.capabilityKey,
      enabled: result.enabled,
      expiredAt: result.expiredAt,
    };
  }

  async updateUser(id: string, input: UpdateUserDto, audit?: UserAuditContext) {
    if (input.username) {
      this.assertUsername(input.username);
    }

    if (input.password) {
      this.assertPasswordPolicy(input.password);
    }

    const userId = BigInt(id);
    const user = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!existingUser) {
        throw new NotFoundException('User not found.');
      }

      await this.assertAdminSafety(tx, existingUser, input, audit);

      const updatedUser = await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          username: input.username?.trim(),
          passwordHash: input.password
            ? this.hashPassword(input.password)
            : undefined,
          role: input.role,
          levelCode: input.levelCode,
          status: input.status,
          mobile: input.mobile,
          email: input.email,
        },
      });

      await tx.operationLog.create({
        data: {
          userId: audit?.operator ? BigInt(audit.operator.id) : undefined,
          action: 'user.update',
          targetType: 'user',
          targetId: updatedUser.id,
          ip: audit?.ip,
          detailJson: this.toPrismaJson({
            before: this.buildAuditSnapshot(existingUser),
            after: this.buildAuditSnapshot(updatedUser),
            operator: audit?.operator?.username,
            userAgent: audit?.userAgent,
          }),
        },
      });

      return updatedUser;
    });

    return this.mapUser(user);
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: {
        username: username.trim(),
      },
    });
  }

  verifyPassword(user: User, password: string) {
    if (user.passwordHash.startsWith(`${this.passwordHashPrefix}$`)) {
      return this.verifyPbkdf2Password(user.passwordHash, password);
    }

    return user.passwordHash === this.hashLegacyPassword(password);
  }

  needsPasswordRehash(user: User) {
    return !user.passwordHash.startsWith(`${this.passwordHashPrefix}$`);
  }

  async updatePasswordHash(userId: bigint, password: string) {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash: this.hashPassword(password),
      },
    });
  }

  private hashPassword(password: string) {
    const iterations = this.configService.get<number>(
      'PASSWORD_HASH_ITERATIONS',
      120000,
    );
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString(
      'hex',
    );

    return `${this.passwordHashPrefix}$${iterations}$${salt}$${hash}`;
  }

  private hashLegacyPassword(password: string) {
    return createHash('sha256').update(password).digest('hex');
  }

  private verifyPbkdf2Password(storedHash: string, password: string) {
    const [, iterationsText, salt, expectedHash] = storedHash.split('$');
    const iterations = Number(iterationsText);

    if (!iterations || !salt || !expectedHash) {
      return false;
    }

    const actual = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
    const expected = Buffer.from(expectedHash, 'hex');

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private async assertAdminSafety(
    tx: Prisma.TransactionClient,
    user: User,
    input: UpdateUserDto,
    audit?: UserAuditContext,
  ) {
    const nextRole = input.role ?? user.role;
    const nextStatus = input.status ?? user.status;
    const isAdminDowngrade = user.role === 'admin' && nextRole !== 'admin';
    const isAdminDisable = user.role === 'admin' && nextStatus !== 'active';

    if (!isAdminDowngrade && !isAdminDisable) {
      return;
    }

    if (audit?.operator?.id === user.id.toString()) {
      throw new BadRequestException('Cannot disable or downgrade your own admin account.');
    }

    const remainingActiveAdmins = await tx.user.count({
      where: {
        id: {
          not: user.id,
        },
        role: 'admin',
        status: 'active',
      },
    });

    if (remainingActiveAdmins === 0) {
      throw new BadRequestException('At least one active admin account must remain.');
    }
  }

  private assertAdminPermissionKey(permission: string) {
    const validPermissions = new Set(
      ADMIN_PERMISSION_OPTIONS.map((option) => option.key),
    );

    if (!validPermissions.has(permission as AdminPermission)) {
      throw new BadRequestException('Unknown admin permission.');
    }
  }

  private assertSelfPermissionSafety(
    targetUser: User,
    permission: AdminPermission,
    input: UpdateAdminPermissionDto,
    audit?: UserAuditContext,
  ) {
    if (input.enabled) {
      return;
    }

    if (audit?.operator?.id !== targetUser.id.toString()) {
      return;
    }

    if (
      permission === ADMIN_PERMISSIONS.fullAccess ||
      permission === ADMIN_PERMISSIONS.usersManage
    ) {
      throw new BadRequestException(
        'Cannot remove your own critical admin permission.',
      );
    }
  }

  private buildAuditSnapshot(user: User) {
    return {
      id: user.id.toString(),
      username: user.username,
      role: user.role,
      levelCode: user.levelCode,
      status: user.status,
      mobile: this.maskMobile(user.mobile),
      email: this.maskEmail(user.email),
    };
  }

  private toPrismaJson(value: Record<string, unknown>): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private toOptionalPrismaJson(
    value: Record<string, unknown | undefined>,
  ): Prisma.InputJsonValue | undefined {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined);

    if (entries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(entries) as Prisma.InputJsonValue;
  }

  private assertUsername(username: string) {
    const normalized = username.trim();

    if (normalized.length < 3) {
      throw new BadRequestException('Username must be at least 3 characters.');
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(normalized)) {
      throw new BadRequestException(
        'Username can only contain letters, numbers, dots, underscores, and hyphens.',
      );
    }
  }

  private assertPasswordPolicy(password: string) {
    const minLength = this.configService.get<number>('PASSWORD_MIN_LENGTH', 6);
    const requireComplexity = this.configService.get<string>(
      'PASSWORD_REQUIRE_COMPLEXITY',
      'false',
    );

    if (password.length < minLength) {
      throw new BadRequestException(
        `Password must be at least ${minLength} characters.`,
      );
    }

    if (/\s/.test(password)) {
      throw new BadRequestException('Password must not contain whitespace.');
    }

    if (
      requireComplexity === 'true' &&
      (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    ) {
      throw new BadRequestException(
        'Password must include at least one letter and one number.',
      );
    }
  }

  private mapUser(user: User) {
    return {
      id: user.id.toString(),
      username: user.username,
      mobile: this.maskMobile(user.mobile),
      email: this.maskEmail(user.email),
      role: user.role,
      levelCode: user.levelCode,
      status: user.status,
      balance: user.balance.toNumber(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private maskMobile(mobile: string | null) {
    if (!mobile) {
      return mobile;
    }

    return mobile.replace(/^(\d{3})\d+(\d{2})$/, '$1****$2');
  }

  private maskEmail(email: string | null) {
    if (!email) {
      return email;
    }

    const [name, domain] = email.split('@');
    if (!name || !domain) {
      return email;
    }

    return `${name.slice(0, 2)}***@${domain}`;
  }
}
