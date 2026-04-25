import { Injectable } from '@nestjs/common';
import type { CapabilityKey, LevelCode } from './capability.constants';
import { DEFAULT_LEVEL_TEMPLATES } from './default-levels';
import type {
  CapabilityCheckResult,
  LevelCapabilityTemplate,
} from './capability.types';

@Injectable()
export class CapabilityService {
  listLevelTemplates(): LevelCapabilityTemplate[] {
    return DEFAULT_LEVEL_TEMPLATES;
  }

  checkLevelCapability(
    level: LevelCode,
    key: CapabilityKey,
  ): CapabilityCheckResult {
    const template = DEFAULT_LEVEL_TEMPLATES.find((item) => item.level === level);
    const capability = template?.capabilities.find((item) => item.key === key);

    return {
      allowed: Boolean(capability?.enabled),
      level,
      key,
      limitValue: capability?.limitValue,
    };
  }
}
