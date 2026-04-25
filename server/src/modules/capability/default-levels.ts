import { CAPABILITY_KEYS } from './capability.constants';
import type { LevelCapabilityTemplate } from './capability.types';

export const DEFAULT_LEVEL_TEMPLATES: LevelCapabilityTemplate[] = [
  {
    level: 'V0',
    name: '普通用户',
    description: '普通买家，只能购买商品和查询订单。',
    capabilities: [
      {
        key: CAPABILITY_KEYS.purchaseGoods,
        enabled: true,
      },
    ],
  },
  {
    level: 'V1',
    name: '一级代理',
    description: '享受管理员配置的进货折扣价，其他特权由主站管理员配置。',
    capabilities: [
      {
        key: CAPABILITY_KEYS.purchaseGoods,
        enabled: true,
      },
      {
        key: CAPABILITY_KEYS.agentDiscount,
        enabled: true,
        config: {
          discountRate: 0.9,
        },
      },
      {
        key: CAPABILITY_KEYS.siteCreate,
        enabled: false,
        limitValue: 0,
      },
      {
        key: CAPABILITY_KEYS.domainSystemSub,
        enabled: false,
      },
      {
        key: CAPABILITY_KEYS.productCustomPrice,
        enabled: false,
      },
    ],
  },
  {
    level: 'V2',
    name: '二级代理',
    description: '高级代理模板，默认开启高级特权，但所有特权仍由主站管理员配置。',
    capabilities: [
      {
        key: CAPABILITY_KEYS.purchaseGoods,
        enabled: true,
      },
      {
        key: CAPABILITY_KEYS.agentDiscount,
        enabled: true,
        config: {
          discountRate: 0.8,
        },
      },
      {
        key: CAPABILITY_KEYS.siteCreate,
        enabled: true,
        limitValue: 10,
      },
      {
        key: CAPABILITY_KEYS.domainSystemSub,
        enabled: true,
      },
      {
        key: CAPABILITY_KEYS.domainCustom,
        enabled: true,
      },
      {
        key: CAPABILITY_KEYS.domainMaxCount,
        enabled: true,
        limitValue: 20,
      },
      {
        key: CAPABILITY_KEYS.productCustomPrice,
        enabled: true,
      },
      {
        key: CAPABILITY_KEYS.productCustomName,
        enabled: true,
      },
      {
        key: CAPABILITY_KEYS.productCustomDescription,
        enabled: true,
      },
      {
        key: CAPABILITY_KEYS.templatePremium,
        enabled: true,
      },
      {
        key: CAPABILITY_KEYS.pricingAdvanced,
        enabled: true,
      },
      {
        key: CAPABILITY_KEYS.statsProfit,
        enabled: true,
      },
      {
        key: CAPABILITY_KEYS.apiAccess,
        enabled: true,
      },
    ],
  },
];
