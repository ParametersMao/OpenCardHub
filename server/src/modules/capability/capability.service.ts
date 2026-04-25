import { Injectable } from '@nestjs/common';
import { Prisma, UserLevelCode } from '@prisma/client';
import type { CapabilityKey, LevelCode } from './capability.constants';
import { DEFAULT_LEVEL_TEMPLATES } from './default-levels';
import type {
  CapabilityCheckResult,
  LevelCapabilityTemplate,
  PersistedLevelTemplate,
} from './capability.types';
import { PrismaService } from '../database/prisma.service';

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
