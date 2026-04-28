export const ADMIN_PERMISSIONS = {
  fullAccess: 'admin.full_access',
  usersManage: 'admin.users.manage',
  capabilitiesManage: 'admin.capabilities.manage',
  catalogManage: 'admin.catalog.manage',
  inventoryManage: 'admin.inventory.manage',
  sitesManage: 'admin.sites.manage',
  financeView: 'admin.finance.view',
  financeReview: 'admin.finance.review',
  approvalsReview: 'admin.approvals.review',
  settingsManage: 'admin.settings.manage',
} as const;

export type AdminPermission =
  (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];

export const ADMIN_PERMISSION_OPTIONS: Array<{
  key: AdminPermission;
  label: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}> = [
  {
    key: ADMIN_PERMISSIONS.fullAccess,
    label: '超级管理员',
    description: '拥有所有后台权限，建议只授予主账号。',
    riskLevel: 'high',
  },
  {
    key: ADMIN_PERMISSIONS.usersManage,
    label: '用户管理',
    description: '创建用户、调整等级、启用或禁用账号。',
    riskLevel: 'high',
  },
  {
    key: ADMIN_PERMISSIONS.capabilitiesManage,
    label: '等级能力配置',
    description: '配置 V0/V1/V2 的能力开关和限制值。',
    riskLevel: 'high',
  },
  {
    key: ADMIN_PERMISSIONS.catalogManage,
    label: '商品管理',
    description: '管理分类、商品、分站商品覆盖配置。',
    riskLevel: 'medium',
  },
  {
    key: ADMIN_PERMISSIONS.inventoryManage,
    label: '库存管理',
    description: '导入卡密、查看库存和卡密列表。',
    riskLevel: 'high',
  },
  {
    key: ADMIN_PERMISSIONS.sitesManage,
    label: '分站管理',
    description: '创建分站、绑定域名、调整分站状态。',
    riskLevel: 'medium',
  },
  {
    key: ADMIN_PERMISSIONS.financeView,
    label: '财务查看',
    description: '查看财务概览、报表、结算和审计日志。',
    riskLevel: 'medium',
  },
  {
    key: ADMIN_PERMISSIONS.financeReview,
    label: '财务审核',
    description: '审核提现、标记打款、确认或作废结算单。',
    riskLevel: 'high',
  },
  {
    key: ADMIN_PERMISSIONS.approvalsReview,
    label: '审批审核',
    description: '审核高风险操作申请，例如权限变更、财务打款和结算确认。',
    riskLevel: 'high',
  },
  {
    key: ADMIN_PERMISSIONS.settingsManage,
    label: '系统配置',
    description: '管理全局设置、站点设置和公开配置。',
    riskLevel: 'high',
  },
];
