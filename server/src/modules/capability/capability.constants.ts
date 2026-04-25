export const LEVEL_CODES = ['V0', 'V1', 'V2'] as const;

export type LevelCode = (typeof LEVEL_CODES)[number];

export const CAPABILITY_KEYS = {
  purchaseGoods: 'purchase.goods',
  agentDiscount: 'agent.discount',
  siteCreate: 'site.create',
  siteMaxCount: 'site.max_count',
  domainSystemSub: 'domain.system_sub',
  domainCustom: 'domain.custom',
  domainMaxCount: 'domain.max_count',
  productCustomPrice: 'product.custom_price',
  productCustomName: 'product.custom_name',
  productCustomDescription: 'product.custom_description',
  templateBasic: 'template.basic',
  templatePremium: 'template.premium',
  pricingAdvanced: 'pricing.advanced',
  statsProfit: 'stats.profit',
  apiAccess: 'api.access',
  paymentOwnProvider: 'payment.own_provider',
} as const;

export type CapabilityKey =
  (typeof CAPABILITY_KEYS)[keyof typeof CAPABILITY_KEYS];
