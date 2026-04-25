const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const capabilityKeys = {
  purchaseGoods: 'purchase.goods',
  agentDiscount: 'agent.discount',
  siteCreate: 'site.create',
  domainSystemSub: 'domain.system_sub',
  domainCustom: 'domain.custom',
  domainMaxCount: 'domain.max_count',
  productCustomPrice: 'product.custom_price',
  productCustomName: 'product.custom_name',
  productCustomDescription: 'product.custom_description',
  templatePremium: 'template.premium',
  pricingAdvanced: 'pricing.advanced',
  statsProfit: 'stats.profit',
  apiAccess: 'api.access',
};

const levels = [
  {
    code: 'V0',
    name: '普通用户',
    description: '普通买家，只能购买商品和查询订单。',
    capabilities: [
      {
        key: capabilityKeys.purchaseGoods,
        enabled: true,
      },
    ],
  },
  {
    code: 'V1',
    name: '一级代理',
    description: '享受管理员配置的进货折扣价，其他特权由主站管理员配置。',
    capabilities: [
      {
        key: capabilityKeys.purchaseGoods,
        enabled: true,
      },
      {
        key: capabilityKeys.agentDiscount,
        enabled: true,
        config: {
          discountRate: 0.9,
        },
      },
      {
        key: capabilityKeys.siteCreate,
        enabled: false,
        limitValue: 0,
      },
      {
        key: capabilityKeys.domainSystemSub,
        enabled: false,
      },
      {
        key: capabilityKeys.productCustomPrice,
        enabled: false,
      },
    ],
  },
  {
    code: 'V2',
    name: '二级代理',
    description: '高级代理模板，默认开启高级特权，但所有特权仍由主站管理员配置。',
    capabilities: [
      {
        key: capabilityKeys.purchaseGoods,
        enabled: true,
      },
      {
        key: capabilityKeys.agentDiscount,
        enabled: true,
        config: {
          discountRate: 0.8,
        },
      },
      {
        key: capabilityKeys.siteCreate,
        enabled: true,
        limitValue: 10,
      },
      {
        key: capabilityKeys.domainSystemSub,
        enabled: true,
      },
      {
        key: capabilityKeys.domainCustom,
        enabled: true,
      },
      {
        key: capabilityKeys.domainMaxCount,
        enabled: true,
        limitValue: 20,
      },
      {
        key: capabilityKeys.productCustomPrice,
        enabled: true,
      },
      {
        key: capabilityKeys.productCustomName,
        enabled: true,
      },
      {
        key: capabilityKeys.productCustomDescription,
        enabled: true,
      },
      {
        key: capabilityKeys.templatePremium,
        enabled: true,
      },
      {
        key: capabilityKeys.pricingAdvanced,
        enabled: true,
      },
      {
        key: capabilityKeys.statsProfit,
        enabled: true,
      },
      {
        key: capabilityKeys.apiAccess,
        enabled: true,
      },
    ],
  },
];

async function main() {
  for (const [sortOrder, template] of levels.entries()) {
    const level = await prisma.agentLevel.upsert({
      where: {
        code: template.code,
      },
      create: {
        code: template.code,
        name: template.name,
        description: template.description,
        sortOrder,
      },
      update: {
        name: template.name,
        description: template.description,
        sortOrder,
      },
    });

    for (const capability of template.capabilities) {
      await prisma.levelCapability.upsert({
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
          configJson: capability.config,
        },
        update: {
          enabled: capability.enabled,
          limitValue: capability.limitValue,
          configJson: capability.config,
        },
      });
    }
  }

  await prisma.user.upsert({
    where: {
      username: 'admin',
    },
    create: {
      username: 'admin',
      passwordHash:
        '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
      role: 'admin',
      levelCode: 'V2',
    },
    update: {
      role: 'admin',
      levelCode: 'V2',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
