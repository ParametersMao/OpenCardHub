import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type {
  ConfigScope,
  PersistedSetting,
  ResolvedSetting,
} from './config-center.types';
import type { UpsertSettingDto } from './dto/upsert-setting.dto';

@Injectable()
export class ConfigCenterService {
  constructor(private readonly prisma: PrismaService) {}

  async listSettings(input: {
    scopeType?: string;
    scopeId?: string;
    group?: string;
  }): Promise<PersistedSetting[]> {
    const settings = await this.prisma.setting.findMany({
      where: {
        scopeType: input.scopeType,
        scopeId: input.scopeId ? BigInt(input.scopeId) : undefined,
        group: input.group,
      },
      orderBy: [{ scopeType: 'asc' }, { group: 'asc' }, { key: 'asc' }],
    });

    return settings.map((setting) => this.mapSetting(setting));
  }

  async upsertSetting(input: UpsertSettingDto): Promise<PersistedSetting> {
    const scopeId = this.normalizeScopeId(input.scopeId);
    const setting = await this.prisma.setting.upsert({
      where: {
        scopeType_scopeId_group_key: {
          scopeType: input.scopeType,
          scopeId,
          group: input.group,
          key: input.key,
        },
      },
      create: {
        scopeType: input.scopeType,
        scopeId,
        group: input.group,
        key: input.key,
        valueJson: this.toPrismaJson(input.value),
        type: input.type ?? 'json',
        isPublic: input.isPublic ?? false,
      },
      update: {
        valueJson: this.toPrismaJson(input.value),
        type: input.type ?? 'json',
        isPublic: input.isPublic ?? false,
      },
    });

    return this.mapSetting(setting);
  }

  async resolveSetting(input: {
    group: string;
    key: string;
    scopes: ConfigScope[];
  }): Promise<ResolvedSetting> {
    const candidates = await this.prisma.setting.findMany({
      where: {
        group: input.group,
        key: input.key,
        OR: input.scopes.map((scope) => ({
          scopeType: scope.type,
          scopeId: this.normalizeScopeId(scope.id),
        })),
      },
    });

    for (const scope of [...input.scopes].reverse()) {
      const matched = candidates.find((setting) => {
        const settingScopeId = this.denormalizeScopeId(setting.scopeId);
        return (
          setting.scopeType === scope.type &&
          (settingScopeId ?? undefined) === scope.id
        );
      });

      if (matched) {
        return {
          group: input.group,
          key: input.key,
          value: matched.valueJson,
          source: {
            scopeType: matched.scopeType,
          scopeId: this.denormalizeScopeId(matched.scopeId),
          },
        };
      }
    }

    return {
      group: input.group,
      key: input.key,
      value: undefined,
    };
  }

  private mapSetting(setting: {
    id: bigint;
    scopeType: string;
    scopeId: bigint | null;
    group: string;
    key: string;
    valueJson: Prisma.JsonValue;
    type: string;
    isPublic: boolean;
  }): PersistedSetting {
    return {
      id: setting.id.toString(),
      scopeType: setting.scopeType,
      scopeId: this.denormalizeScopeId(setting.scopeId),
      group: setting.group,
      key: setting.key,
      value: setting.valueJson,
      type: setting.type,
      isPublic: setting.isPublic,
    };
  }

  private toPrismaJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private normalizeScopeId(scopeId: string | undefined): bigint {
    return scopeId ? BigInt(scopeId) : BigInt(0);
  }

  private denormalizeScopeId(scopeId: bigint | null): string | undefined {
    if (!scopeId || scopeId === BigInt(0)) {
      return undefined;
    }

    return scopeId.toString();
  }
}
