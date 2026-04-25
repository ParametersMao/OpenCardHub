export const CONFIG_SCOPE_TYPES = [
  'global',
  'edition',
  'level',
  'user',
  'site',
  'product',
] as const;

export type ConfigScopeType = (typeof CONFIG_SCOPE_TYPES)[number];

export interface ConfigScope {
  type: ConfigScopeType;
  id?: string;
}

export interface PersistedSetting {
  id: string;
  scopeType: string;
  scopeId?: string;
  group: string;
  key: string;
  value: unknown;
  type: string;
  isPublic: boolean;
}

export interface ResolvedSetting {
  group: string;
  key: string;
  value: unknown;
  source?: {
    scopeType: string;
    scopeId?: string;
  };
}
