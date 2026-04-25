import type { CapabilityKey, LevelCode } from './capability.constants';

export interface CapabilityRule {
  key: CapabilityKey;
  enabled: boolean;
  limitValue?: number;
  config?: Record<string, unknown>;
}

export interface LevelCapabilityTemplate {
  level: LevelCode;
  name: string;
  description: string;
  capabilities: CapabilityRule[];
}

export interface CapabilityCheckInput {
  level: LevelCode;
  key: CapabilityKey;
}

export interface CapabilityCheckResult {
  allowed: boolean;
  level: LevelCode;
  key: CapabilityKey;
  limitValue?: number;
}

export interface PersistedCapability {
  id: string;
  key: string;
  enabled: boolean;
  limitValue?: number;
  config?: Record<string, unknown>;
}

export interface PersistedLevelTemplate {
  id: string;
  level: LevelCode;
  name: string;
  description?: string;
  capabilities: PersistedCapability[];
}
