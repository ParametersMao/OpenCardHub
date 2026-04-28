import { Injectable } from '@nestjs/common';
import { Prisma, UserLevelCode } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import type { CapabilityKey, LevelCode } from './capability.constants';
import { DEFAULT_LEVEL_TEMPLATES } from './default-levels';
import type {
  CapabilityCheckResult,
  LevelCapabilityTemplate,
  PersistedLevelTemplate,
} from './capability.types';
import { PrismaService } from '../database/prisma.service';
import type { UpdateLevelCapabilityDto } from './dto/update-level-capability.dto';

interface CapabilityAuditContext {
  operator?: AuthUser;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class CapabilityService {
  constructor(private readonly prisma: PrismaService) {}

  listLevelTemplates(): LevelCapabilityTemplate[] {
    return DEFAULT_LEVEL_TEMPLATES;
  }

  async listPersistedLevelTemplates(): Promise<PersistedLevelTemplate[]> {
    const levels = await this.prisma.agentLevel.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        capabilities: {
          orderBy: {
            capabilityKey: 'asc',
          },
        },
      },
    });

    return levels.map((level) => ({
      id: level.id.toString(),
      level: level.code,
      name: level.name,
      description: level.description ?? undefined,
      capabilities: level.capabilities.map((capability) => ({
        id: capability.id.toString(),
        key: capability.capabilityKey,
        enabled: capability.enabled,
        limitValue: capability.limitValue ?? undefined,
        config: this.asRecord(capability.configJson),
      })),
    }));
  }

  async bootstrapDefaultLevels(): Promise<PersistedLevelTemplate[]> {
    for (const [index, template] of DEFAULT_LEVEL_TEMPLATES.entries()) {
      const level = await this.prisma.agentLevel.upsert({
        where: {
          code: template.level,
        },
        create: {
          code: template.level,
          name: template.name,
          description: template.description,
          sortOrder: index,
        },
        update: {
          name: template.name,
          description: template.description,
          sortOrder: index,
        },
      });

      for (const capability of template.capabilities) {
        await this.prisma.levelCapability.upsert({
          where: {
            levelId_capabilityKey: {
              levelId: level.id,
              capabilityKey: capability.key,
            },
          },
          create: {
            levelId: level.id,
            capabilityKey: capability.key,
            enabled: capability.enabled,
            limitValue: capability.limitValue,
            configJson: this.toPrismaJson(capability.config),
          },
          update: {
            enabled: capability.enabled,
            limitValue: capability.limitValue,
            configJson: this.toPrismaJson(capability.config),
          },
        });
      }
    }

    return this.listPersistedLevelTemplates();
  }

  async checkLevelCapability(
    level: LevelCode,
    key: CapabilityKey,
  ): Promise<CapabilityCheckResult> {
    const persistedCapability = await this.prisma.levelCapability.findFirst({
      where: {
        capabilityKey: key,
        level: {
          code: level as UserLevelCode,
        },
      },
    });

    if (persistedCapability) {
      return {
        allowed: persistedCapability.enabled,
        level,
        key,
        limitValue: persistedCapability.limitValue ?? undefined,
        config: this.asRecord(persistedCapability.configJson),
      };
    }

    const template = DEFAULT_LEVEL_TEMPLATES.find(
      (item) => item.level === level,
    );
    const capability = template?.capabilities.find((item) => item.key === key);

    return {
      allowed: Boolean(capability?.enabled),
      level,
      key,
      limitValue: capability?.limitValue,
      config: capability?.config,
    };
  }

  async updateLevelCapability(
    level: LevelCode,
    key: CapabilityKey,
    input: UpdateLevelCapabilityDto,
    audit?: CapabilityAuditContext,
  ): Promise<PersistedLevelTemplate> {
    const updatedLevel = await this.prisma.$transaction(async (tx) => {
      const levelRecord = await tx.agentLevel.upsert({
        where: {
          code: level,
        },
        create: {
          code: level,
          name: level,
        },
        update: {},
      });

      const existingCapability = await tx.levelCapability.findUnique({
        where: {
          levelId_capabilityKey: {
            levelId: levelRecord.id,
            capabilityKey: key,
          },
        },
      });

      await tx.levelCapability.upsert({
        where: {
          levelId_capabilityKey: {
            levelId: levelRecord.id,
            capabilityKey: key,
          },
        },
        create: {
          levelId: levelRecord.id,
          capabilityKey: key,
          enabled: input.enabled,
          limitValue: input.limitValue,
        },
        update: {
          enabled: input.enabled,
          limitValue: input.limitValue,
        },
      });

      await tx.operationLog.create({
        data: {
          userId: audit?.operator ? BigInt(audit.operator.id) : undefined,
          action: 'capability.level.update',
          targetType: 'agent_level',
          targetId: levelRecord.id,
          ip: audit?.ip,
          detailJson: this.toPrismaJson({
            level,
            capability: key,
            before: existingCapability
              ? {
                  enabled: existingCapability.enabled,
                  limitValue: existingCapability.limitValue,
                }
              : undefined,
            after: {
              enabled: input.enabled,
              limitValue: input.limitValue,
            },
            operator: audit?.operator?.username,
            userAgent: audit?.userAgent,
          }),
        },
      });

      return tx.agentLevel.findUniqueOrThrow({
        where: {
          id: levelRecord.id,
        },
        include: {
          capabilities: {
            orderBy: {
              capabilityKey: 'asc',
            },
          },
        },
      });
    });

    return {
      id: updatedLevel.id.toString(),
      level: updatedLevel.code,
      name: updatedLevel.name,
      description: updatedLevel.description ?? undefined,
      capabilities: updatedLevel.capabilities.map((capability) => ({
        id: capability.id.toString(),
        key: capability.capabilityKey,
        enabled: capability.enabled,
        limitValue: capability.limitValue ?? undefined,
        config: this.asRecord(capability.configJson),
      })),
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return undefined;
  }

  private toPrismaJson(
    value: Record<string, unknown> | undefined,
  ): Prisma.InputJsonValue | undefined {
    return value as Prisma.InputJsonValue | undefined;
  }
}
