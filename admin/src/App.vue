<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

type AdminViewKey =
  | 'overview'
  | 'approvals'
  | 'levels'
  | 'users'
  | 'catalog'
  | 'inventory'
  | 'sites'
  | 'finance';
type AgentViewKey = 'agent-sites' | 'agent-orders' | 'agent-finance';
type ViewKey = AdminViewKey | AgentViewKey;

interface Capability {
  id?: string;
  key: string;
  enabled: boolean;
  limitValue?: number;
  config?: Record<string, unknown>;
}

interface Level {
  id?: string;
  level: string;
  name: string;
  description?: string;
  capabilities: Capability[];
}

interface Category {
  id: string;
  name: string;
  status: string;
}

interface Product {
  id: string;
  name: string;
  category?: Category;
  description?: string;
  salePrice: number;
  minSalePrice: number;
  defaultWholesalePrice: number;
  stockCount: number;
  allowSiteSale?: boolean;
  allowAgentEditPrice?: boolean;
  allowAgentEditName?: boolean;
  allowAgentEditDescription?: boolean;
  status: string;
}

interface SiteProductOverride {
  id?: string;
  siteId: string;
  productId: string;
  customName?: string;
  customDescription?: string;
  customCover?: string;
  customPrice?: number;
  isVisible: boolean;
  sortOrder: number;
  product?: Product;
}

interface SiteDomain {
  id?: string;
  domain: string;
  type: string;
  status: string;
  isPrimary: boolean;
}

interface Site {
  id: string;
  name: string;
  ownerUserId: string;
  status: string;
  logo?: string;
  seoTitle?: string;
  seoKeywords?: string;
  seoDescription?: string;
  notice?: string;
  domains: SiteDomain[];
}

interface User {
  id: string;
  username: string;
  role: 'admin' | 'agent' | 'buyer';
  levelCode: 'V0' | 'V1' | 'V2';
  status?: string;
  balance?: number;
  createdAt?: string;
}

interface AdminPermissionOption {
  key: string;
  label: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface AdminPermission extends AdminPermissionOption {
  configured: boolean;
  enabled: boolean;
  expiredAt?: string;
}

interface AdminPermissionProfile {
  user: User;
  legacyFullAccess: boolean;
  permissions: AdminPermission[];
}

interface EffectiveAdminPermissionProfile {
  legacyFullAccess: boolean;
  effectivePermissions: string[];
  permissions: AdminPermission[];
}

interface ApprovalRequest {
  id: string;
  requestNo: string;
  type: string;
  status: string;
  requesterId?: string;
  reviewerId?: string;
  targetType?: string;
  targetId?: string;
  action: string;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  remark?: string;
  reviewRemark?: string;
  createdAt: string;
  reviewedAt?: string;
  appliedAt?: string;
}

interface ApprovalActionResult {
  approvalRequired?: boolean;
  approval?: ApprovalRequest;
}

interface StockSnapshot {
  productId: string;
  counts: Record<string, number>;
}

interface AgentOrder {
  id: string;
  orderNo: string;
  siteName?: string;
  productName?: string;
  quantity: number;
  totalAmount: number;
  agentProfit: number;
  platformProfit: number;
  paymentStatus: string;
  deliveryStatus: string;
  orderStatus: string;
  createdAt: string;
}

interface AgentOrderSummary {
  totalOrders: number;
  paidOrders: number;
  totalAmount: number;
  paidAmount: number;
  agentProfit: number;
  platformProfit: number;
}

interface FinanceSummary {
  balance: number;
  pendingWithdrawalAmount: number;
  totalProfit: number;
}

interface FinanceTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  referenceNo: string;
  remark?: string;
  createdAt: string;
}

interface Withdrawal {
  id: string;
  userId: string;
  username?: string;
  amount: number;
  status: string;
  accountType: string;
  accountName: string;
  accountNo: string;
  remark?: string;
  reviewRemark?: string;
  createdAt: string;
}

interface SettlementSnapshot {
  generatedAt?: string;
  scope?: string;
  period?: {
    startDate?: string;
    endDate?: string;
  };
  orders?: {
    paidCount?: number;
    paidAmount?: number;
    costAmount?: number;
    agentProfit?: number;
    platformProfit?: number;
  };
  withdrawals?: {
    paidCount?: number;
    paidAmount?: number;
  };
}

interface Settlement {
  id: string;
  settlementNo: string;
  settlementScope: string;
  userId?: string;
  username?: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  paidOrderCount: number;
  paidAmount: number;
  costAmount: number;
  agentProfit: number;
  platformProfit: number;
  withdrawalAmount: number;
  snapshot?: SettlementSnapshot;
  remark?: string;
  confirmedAt?: string;
  voidedAt?: string;
  createdAt: string;
}

interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  ip?: string;
  detail?: Record<string, unknown>;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

interface SettlementDetailOrder {
  id: string;
  orderNo: string;
  agentUsername?: string;
  siteName?: string;
  productName?: string;
  quantity: number;
  totalAmount: number;
  costAmount: number;
  agentProfit: number;
  platformProfit: number;
  paymentMethod?: string;
  paidAt?: string;
}

interface SettlementDetailWithdrawal {
  id: string;
  username: string;
  amount: number;
  accountType: string;
  accountName: string;
  accountNo: string;
  reviewRemark?: string;
  paidAt?: string;
}

interface SettlementDetails {
  settlement: Settlement;
  orders: PaginatedResult<SettlementDetailOrder>;
  withdrawals: PaginatedResult<SettlementDetailWithdrawal>;
}

interface AdminFinanceSummary {
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  paidCount: number;
  paidAmount: number;
  rejectedCount: number;
  rejectedAmount: number;
}

interface AdminFinanceReport {
  range: {
    startDate?: string;
    endDate?: string;
  };
  orders: {
    paidCount: number;
    paidAmount: number;
    costAmount: number;
    agentProfit: number;
    platformProfit: number;
    directCount: number;
    directAmount: number;
    agentCount: number;
    agentAmount: number;
  };
  withdrawals: {
    pendingCount: number;
    pendingAmount: number;
    approvedCount: number;
    approvedAmount: number;
    paidCount: number;
    paidAmount: number;
    rejectedCount: number;
    rejectedAmount: number;
  };
}

interface AgentFinanceReport {
  range: {
    startDate?: string;
    endDate?: string;
  };
  orders: {
    paidCount: number;
    paidAmount: number;
    agentProfit: number;
    platformProfit: number;
  };
  profit: {
    creditedCount: number;
    creditedAmount: number;
  };
  withdrawals: {
    paidCount: number;
    paidAmount: number;
  };
}

const adminNavItems: Array<{ key: AdminViewKey; label: string }> = [
  { key: 'overview', label: '总览' },
  { key: 'approvals', label: '审批' },
  { key: 'levels', label: '等级能力' },
  { key: 'users', label: '用户' },
  { key: 'catalog', label: '商品' },
  { key: 'inventory', label: '库存' },
  { key: 'sites', label: '分站' },
  { key: 'finance', label: '财务' },
];
const agentNavItems: Array<{ key: AgentViewKey; label: string }> = [
  { key: 'agent-sites', label: '我的分站' },
  { key: 'agent-orders', label: '我的订单' },
  { key: 'agent-finance', label: '我的财务' },
];
const adminViewPermissions: Partial<Record<AdminViewKey, string>> = {
  approvals: 'admin.approvals.review',
  levels: 'admin.capabilities.manage',
  users: 'admin.users.manage',
  catalog: 'admin.catalog.manage',
  inventory: 'admin.inventory.manage',
  sites: 'admin.sites.manage',
  finance: 'admin.finance.view',
};

const activeView = ref<ViewKey>('overview');
const loading = ref(false);
const message = ref('');
const accessToken = ref(localStorage.getItem('opencardhub_token') ?? '');
const currentUser = ref<User | null>(null);
const levels = ref<Level[]>([]);
const capabilityKeys = ref<string[]>([]);
const categories = ref<Category[]>([]);
const products = ref<Product[]>([]);
const sites = ref<Site[]>([]);
const agentSites = ref<Site[]>([]);
const agentProducts = ref<Product[]>([]);
const agentSiteOverrides = ref<Record<string, SiteProductOverride[]>>({});
const agentOrders = ref<AgentOrder[]>([]);
const agentFinanceSummary = ref<FinanceSummary>({
  balance: 0,
  pendingWithdrawalAmount: 0,
  totalProfit: 0,
});
const agentFinanceTransactions = ref<FinanceTransaction[]>([]);
const agentWithdrawals = ref<Withdrawal[]>([]);
const approvalRequests = ref<ApprovalRequest[]>([]);
const expandedApprovalId = ref('');
const approvalFilter = ref({
  status: 'pending',
  type: '',
});
const adminWithdrawals = ref<Withdrawal[]>([]);
const adminSettlements = ref<Settlement[]>([]);
const auditLogs = ref<PaginatedResult<AuditLog>>({
  items: [],
  meta: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  },
});
const agentSettlements = ref<Settlement[]>([]);
const expandedSettlementId = ref('');
const expandedAgentSettlementId = ref('');
const settlementDetails = ref<Record<string, SettlementDetails>>({});
const agentSettlementDetails = ref<Record<string, SettlementDetails>>({});
const auditLogFilter = ref({
  action: '',
  targetType: '',
  targetId: '',
  page: 1,
  pageSize: 20,
});
const settlementDetailPagination = ref<
  Record<
    string,
    {
      orderPage: number;
      withdrawalPage: number;
    }
  >
>({});
const agentSettlementDetailPagination = ref<
  Record<
    string,
    {
      orderPage: number;
      withdrawalPage: number;
    }
  >
>({});
const adminFinanceSummary = ref<AdminFinanceSummary>({
  pendingCount: 0,
  pendingAmount: 0,
  approvedCount: 0,
  approvedAmount: 0,
  paidCount: 0,
  paidAmount: 0,
  rejectedCount: 0,
  rejectedAmount: 0,
});
const adminFinanceReport = ref<AdminFinanceReport>({
  range: {},
  orders: {
    paidCount: 0,
    paidAmount: 0,
    costAmount: 0,
    agentProfit: 0,
    platformProfit: 0,
    directCount: 0,
    directAmount: 0,
    agentCount: 0,
    agentAmount: 0,
  },
  withdrawals: {
    pendingCount: 0,
    pendingAmount: 0,
    approvedCount: 0,
    approvedAmount: 0,
    paidCount: 0,
    paidAmount: 0,
    rejectedCount: 0,
    rejectedAmount: 0,
  },
});
const agentFinanceReport = ref<AgentFinanceReport>({
  range: {},
  orders: {
    paidCount: 0,
    paidAmount: 0,
    agentProfit: 0,
    platformProfit: 0,
  },
  profit: {
    creditedCount: 0,
    creditedAmount: 0,
  },
  withdrawals: {
    paidCount: 0,
    paidAmount: 0,
  },
});
const agentOrderSummary = ref<AgentOrderSummary>({
  totalOrders: 0,
  paidOrders: 0,
  totalAmount: 0,
  paidAmount: 0,
  agentProfit: 0,
  platformProfit: 0,
});
const users = ref<User[]>([]);
const stockSnapshots = ref<Record<string, StockSnapshot>>({});
const adminPermissionOptions = ref<AdminPermissionOption[]>([]);
const selectedAdminPermissionUserId = ref('');
const selectedAdminPermissionProfile = ref<AdminPermissionProfile | null>(null);
const currentAdminPermissionProfile = ref<EffectiveAdminPermissionProfile | null>(null);
const adminPermissionLoading = ref(false);

const userForm = ref({
  username: '',
  password: '',
  levelCode: 'V0',
  role: 'buyer',
});
const loginForm = ref({
  username: 'admin',
  password: '123456',
});
const categoryForm = ref({ name: '' });
const productForm = ref({
  categoryId: '',
  name: '',
  costPrice: 0,
  defaultWholesalePrice: 0,
  salePrice: 0,
  minSalePrice: 0,
  allowSiteSale: true,
  allowAgentEditPrice: false,
  allowAgentEditName: false,
  allowAgentEditDescription: false,
});
const inventoryForm = ref({
  productId: '',
  cardsText: '',
});
const siteForm = ref({
  ownerUserId: '',
  name: '',
  systemSubdomain: '',
});
const mySiteForm = ref({
  name: '',
  systemSubdomain: '',
});
const myDomainForm = ref({
  siteId: '',
  domain: '',
  type: 'system_sub',
});
const myProductForm = ref({
  siteId: '',
  productId: '',
  customName: '',
  customDescription: '',
  customCover: '',
  customPrice: undefined as number | undefined,
  isVisible: true,
  sortOrder: 0,
});
const withdrawalForm = ref({
  amount: 0,
  accountType: 'alipay',
  accountName: '',
  accountNo: '',
  remark: '',
});
const financeReportFilter = ref({
  startDate: '',
  endDate: '',
});
const settlementForm = ref({
  userId: '',
  startDate: '',
  endDate: '',
  remark: '',
});
const editingSites = ref<Record<string, Partial<Site>>>({});

const isAdmin = computed(() => currentUser.value?.role === 'admin');
const visibleAdminNavItems = computed(() =>
  adminNavItems.filter((item) => canAccessAdminView(item.key)),
);
const navItems = computed(() =>
  isAdmin.value ? visibleAdminNavItems.value : agentNavItems,
);
const currentViewLabel = computed(
  () => navItems.value.find((item) => item.key === activeView.value)?.label,
);
const agentUsers = computed(() =>
  users.value.filter((user) => user.role === 'agent' || user.levelCode !== 'V0'),
);
const adminUsers = computed(() => users.value.filter((user) => user.role === 'admin'));
const expandedSettlement = computed(() =>
  adminSettlements.value.find((settlement) => settlement.id === expandedSettlementId.value),
);
const expandedAgentSettlement = computed(() =>
  agentSettlements.value.find(
    (settlement) => settlement.id === expandedAgentSettlementId.value,
  ),
);
const expandedApproval = computed(() =>
  approvalRequests.value.find((approval) => approval.id === expandedApprovalId.value),
);
const totals = computed(() => [
  { label: '等级模板', value: levels.value.length },
  { label: '商品数量', value: products.value.length },
  { label: '分站数量', value: sites.value.length },
  { label: '用户数量', value: users.value.length },
  {
    label: '可售库存',
    value: products.value.reduce((sum, product) => sum + product.stockCount, 0),
  },
]);

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken.value
        ? { Authorization: `Bearer ${accessToken.value}` }
        : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }
    throw new Error(await response.text());
  }

  return response.json() as Promise<T>;
}

function confirmCriticalAction(messageText: string) {
  return globalThis.confirm(`高风险操作确认\n\n${messageText}\n\n确认后将立即生效，请确认无误。`);
}

function hasAdminPermission(permission: string) {
  const profile = currentAdminPermissionProfile.value;

  if (!profile) {
    return false;
  }

  return (
    profile.legacyFullAccess ||
    profile.effectivePermissions.includes('admin.full_access') ||
    profile.effectivePermissions.includes(permission)
  );
}

function canAccessAdminView(view: AdminViewKey) {
  const permission = adminViewPermissions[view];

  return !permission || hasAdminPermission(permission);
}

function ensureAccessibleAdminView() {
  if (!isAdminView(activeView.value) || canAccessAdminView(activeView.value)) {
    return;
  }

  activeView.value = visibleAdminNavItems.value[0]?.key ?? 'overview';
}

function buildReportQuery() {
  const params = new globalThis.URLSearchParams();
  if (financeReportFilter.value.startDate) {
    params.set('startDate', `${financeReportFilter.value.startDate}T00:00:00.000Z`);
  }
  if (financeReportFilter.value.endDate) {
    params.set('endDate', `${financeReportFilter.value.endDate}T23:59:59.999Z`);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildAuditLogQuery() {
  const params = new globalThis.URLSearchParams();
  params.set('page', String(auditLogFilter.value.page));
  params.set('pageSize', String(auditLogFilter.value.pageSize));
  if (auditLogFilter.value.action.trim()) {
    params.set('action', auditLogFilter.value.action.trim());
  }
  if (auditLogFilter.value.targetType.trim()) {
    params.set('targetType', auditLogFilter.value.targetType.trim());
  }
  if (auditLogFilter.value.targetId.trim()) {
    params.set('targetId', auditLogFilter.value.targetId.trim());
  }
  return `?${params.toString()}`;
}

function buildApprovalQuery() {
  const params = new globalThis.URLSearchParams();
  if (approvalFilter.value.status) {
    params.set('status', approvalFilter.value.status);
  }
  if (approvalFilter.value.type.trim()) {
    params.set('type', approvalFilter.value.type.trim());
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildSettlementDetailsQuery(
  pagination: { orderPage: number; withdrawalPage: number } | undefined,
) {
  const params = new globalThis.URLSearchParams();
  params.set('orderPage', String(pagination?.orderPage ?? 1));
  params.set('orderPageSize', '10');
  params.set('withdrawalPage', String(pagination?.withdrawalPage ?? 1));
  params.set('withdrawalPageSize', '10');
  return `?${params.toString()}`;
}

async function loadAuditLogs() {
  auditLogs.value = await request<PaginatedResult<AuditLog>>(
    `/api/finance/audit-logs${buildAuditLogQuery()}`,
  );
}

async function loadApprovals() {
  approvalRequests.value = await request<ApprovalRequest[]>(
    `/api/approvals${buildApprovalQuery()}`,
  );
}

async function applyApprovalFilter() {
  expandedApprovalId.value = '';
  await loadApprovals();
}

function toggleApprovalDetails(approvalId: string) {
  expandedApprovalId.value =
    expandedApprovalId.value === approvalId ? '' : approvalId;
}

function resolveApprovalMessage(result: ApprovalActionResult, directMessage: string) {
  if (result.approvalRequired && result.approval) {
    return `已提交审批单 ${result.approval.requestNo}，等待审核后生效。`;
  }

  return directMessage;
}

async function applyAuditLogFilter() {
  auditLogFilter.value.page = 1;
  await loadAuditLogs();
}

async function changeAuditLogPage(delta: number) {
  const nextPage = auditLogFilter.value.page + delta;
  if (nextPage < 1 || nextPage > auditLogs.value.meta.totalPages) {
    return;
  }

  auditLogFilter.value.page = nextPage;
  await loadAuditLogs();
}

async function loadFinanceReports() {
  if (isAdmin.value) {
    if (!hasAdminPermission('admin.finance.view')) {
      message.value = '当前管理员没有财务查看权限';
      return;
    }

    adminFinanceReport.value = await request<AdminFinanceReport>(
      `/api/finance/reports/summary${buildReportQuery()}`,
    );
    return;
  }

  agentFinanceReport.value = await request<AgentFinanceReport>(
    `/api/agent/finance/reports/summary${buildReportQuery()}`,
  );
}

async function login() {
  loading.value = true;
  message.value = '';

  try {
    const result = await request<{
      accessToken: string;
      user: User;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginForm.value),
    });
    accessToken.value = result.accessToken;
    currentUser.value = result.user;
    localStorage.setItem('opencardhub_token', result.accessToken);
    activeView.value = result.user.role === 'admin' ? 'overview' : 'agent-sites';
    await loadAll();
  } catch (error) {
    message.value = error instanceof Error ? error.message : '登录失败';
  } finally {
    loading.value = false;
  }
}

function clearSession() {
  accessToken.value = '';
  currentUser.value = null;
  currentAdminPermissionProfile.value = null;
  localStorage.removeItem('opencardhub_token');
}

function logout() {
  clearSession();
  message.value = '';
}

async function loadAll() {
  if (!accessToken.value) {
    return;
  }

  loading.value = true;
  message.value = '';

  try {
    const me = await request<User>('/api/auth/me');
    currentUser.value = me;

    if (me.role === 'admin') {
      currentAdminPermissionProfile.value =
        await request<EffectiveAdminPermissionProfile>('/api/auth/admin-permissions');
      activeView.value = isAdminView(activeView.value) ? activeView.value : 'overview';
      ensureAccessibleAdminView();
      await loadAdminData();
    } else if (me.role === 'agent') {
      currentAdminPermissionProfile.value = null;
      activeView.value = 'agent-sites';
      await loadAgentData();
    } else {
      currentAdminPermissionProfile.value = null;
      activeView.value = 'agent-sites';
      message.value = '当前账号是普通买家，暂不能进入管理台。';
    }
  } catch (error) {
    message.value = error instanceof Error ? error.message : '加载数据失败';
  } finally {
    loading.value = false;
  }
}

function isAdminView(view: ViewKey): view is AdminViewKey {
  return adminNavItems.some((item) => item.key === view);
}

async function loadAdminData() {
  const canManageCapabilities = hasAdminPermission('admin.capabilities.manage');
  const canManageUsers = hasAdminPermission('admin.users.manage');
  const canManageCatalog = hasAdminPermission('admin.catalog.manage');
  const canManageInventory = hasAdminPermission('admin.inventory.manage');
  const canManageSites = hasAdminPermission('admin.sites.manage');
  const canViewFinance = hasAdminPermission('admin.finance.view');
  const canReviewApprovals = hasAdminPermission('admin.approvals.review');

  const [
    approvals,
    persistedLevels,
    keys,
    userList,
    permissionOptions,
    categoryList,
    productList,
    siteList,
    withdrawalList,
    settlementList,
    auditLogList,
    financeSummary,
    financeReport,
  ] = await Promise.all([
    canReviewApprovals
      ? request<ApprovalRequest[]>(`/api/approvals${buildApprovalQuery()}`)
      : Promise.resolve([]),
    canManageCapabilities
      ? request<Level[]>('/api/capabilities/levels/persisted')
      : Promise.resolve([]),
    canManageCapabilities ? request<string[]>('/api/capabilities/keys') : Promise.resolve([]),
    canManageUsers ? request<User[]>('/api/users') : Promise.resolve([]),
    canManageUsers
      ? request<AdminPermissionOption[]>('/api/users/admin-permission-options')
      : Promise.resolve([]),
    canManageCatalog || canManageInventory
      ? request<Category[]>('/api/catalog/categories')
      : Promise.resolve([]),
    canManageCatalog || canManageInventory
      ? request<Product[]>('/api/catalog/products')
      : Promise.resolve([]),
    canManageSites ? request<Site[]>('/api/sites') : Promise.resolve([]),
    canViewFinance ? request<Withdrawal[]>('/api/finance/withdrawals') : Promise.resolve([]),
    canViewFinance ? request<Settlement[]>('/api/finance/settlements') : Promise.resolve([]),
    canViewFinance
      ? request<PaginatedResult<AuditLog>>('/api/finance/audit-logs?page=1&pageSize=20')
      : Promise.resolve({
          items: [],
          meta: {
            page: 1,
            pageSize: 20,
            total: 0,
            totalPages: 1,
          },
        }),
    canViewFinance
      ? request<AdminFinanceSummary>('/api/finance/summary')
      : Promise.resolve({
          pendingCount: 0,
          pendingAmount: 0,
          approvedCount: 0,
          approvedAmount: 0,
          paidCount: 0,
          paidAmount: 0,
          rejectedCount: 0,
          rejectedAmount: 0,
        }),
    canViewFinance
      ? request<AdminFinanceReport>('/api/finance/reports/summary')
      : Promise.resolve({
          range: {},
          orders: {
            paidCount: 0,
            paidAmount: 0,
            costAmount: 0,
            agentProfit: 0,
            platformProfit: 0,
            directCount: 0,
            directAmount: 0,
            agentCount: 0,
            agentAmount: 0,
          },
          withdrawals: {
            pendingCount: 0,
            pendingAmount: 0,
            approvedCount: 0,
            approvedAmount: 0,
            paidCount: 0,
            paidAmount: 0,
            rejectedCount: 0,
            rejectedAmount: 0,
          },
        }),
  ]);

  approvalRequests.value = approvals;
  levels.value = persistedLevels;
  capabilityKeys.value = keys;
  users.value = userList;
  adminPermissionOptions.value = permissionOptions;
  categories.value = categoryList;
  products.value = productList;
  sites.value = siteList;
  adminWithdrawals.value = withdrawalList;
  adminSettlements.value = settlementList;
  auditLogs.value = auditLogList;
  adminFinanceSummary.value = financeSummary;
  adminFinanceReport.value = financeReport;

  if (
    selectedAdminPermissionUserId.value &&
    !adminUsers.value.some((user) => user.id === selectedAdminPermissionUserId.value)
  ) {
    selectedAdminPermissionUserId.value = '';
    selectedAdminPermissionProfile.value = null;
  }
}

async function loadAgentData() {
  const [
    mySites,
    availableProducts,
    myOrders,
    orderSummary,
    financeSummary,
    financeTransactions,
    withdrawals,
    settlements,
    financeReport,
  ] = await Promise.all([
      request<Site[]>('/api/agent/sites'),
      request<Product[]>('/api/agent/catalog/products'),
      request<AgentOrder[]>('/api/agent/orders'),
      request<AgentOrderSummary>('/api/agent/orders/summary'),
      request<FinanceSummary>('/api/agent/finance/summary'),
      request<FinanceTransaction[]>('/api/agent/finance/transactions'),
      request<Withdrawal[]>('/api/agent/finance/withdrawals'),
      request<Settlement[]>('/api/agent/finance/settlements'),
      request<AgentFinanceReport>('/api/agent/finance/reports/summary'),
    ]);

  agentSites.value = mySites;
  agentProducts.value = availableProducts;
  agentOrders.value = myOrders;
  agentOrderSummary.value = orderSummary;
  agentFinanceSummary.value = financeSummary;
  agentFinanceTransactions.value = financeTransactions;
  agentWithdrawals.value = withdrawals;
  agentSettlements.value = settlements;
  agentFinanceReport.value = financeReport;
  editingSites.value = Object.fromEntries(
    agentSites.value.map((site) => [
      site.id,
      {
        name: site.name,
        logo: site.logo ?? '',
        seoTitle: site.seoTitle ?? '',
        seoKeywords: site.seoKeywords ?? '',
        seoDescription: site.seoDescription ?? '',
        notice: site.notice ?? '',
      },
    ]),
  );

  if (!myProductForm.value.siteId && agentSites.value[0]) {
    myProductForm.value.siteId = agentSites.value[0].id;
  }

  if (!myProductForm.value.productId && agentProducts.value[0]) {
    myProductForm.value.productId = agentProducts.value[0].id;
  }

  await refreshAgentSiteOverrides();
}

async function bootstrapLevels() {
  loading.value = true;
  message.value = '';

  try {
    levels.value = await request<Level[]>('/api/capabilities/levels/bootstrap', {
      method: 'POST',
    });
    message.value = 'V0 / V1 / V2 默认能力已初始化';
  } catch (error) {
    message.value = error instanceof Error ? error.message : '初始化等级能力失败';
  } finally {
    loading.value = false;
  }
}

function getLevelCapability(level: Level, key: string) {
  return level.capabilities.find((capability) => capability.key === key);
}

async function updateLevelCapability(
  level: Level,
  key: string,
  enabled: boolean,
  limitValue?: number,
) {
  if (
    !confirmCriticalAction(
      `即将调整等级 ${level.level} 的能力 ${key}：${enabled ? '启用' : '禁用'}${
        limitValue === undefined ? '' : `，额度/限制值为 ${limitValue}`
      }。`,
    )
  ) {
    return;
  }

  const updatedLevel = await request<Level>(
    `/api/capabilities/levels/${level.level}/${key}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        enabled,
        limitValue,
      }),
    },
  );
  levels.value = levels.value.map((item) =>
    item.level === updatedLevel.level ? updatedLevel : item,
  );
}

async function createUser() {
  if (!userForm.value.username.trim() || !userForm.value.password.trim()) {
    message.value = '请填写用户名和密码';
    return;
  }

  await request('/api/users', {
    method: 'POST',
    body: JSON.stringify(userForm.value),
  });
  userForm.value = {
    username: '',
    password: '',
    levelCode: 'V0',
    role: 'buyer',
  };
  await loadAll();
}

async function updateUserStatus(user: User, status: 'active' | 'disabled') {
  if (
    !confirmCriticalAction(
      `即将把用户 ${user.username} 的状态从 ${user.status} 调整为 ${status}。`,
    )
  ) {
    return;
  }

  await request(`/api/users/${user.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  await loadAll();
}

async function loadAdminPermissionProfile(userId = selectedAdminPermissionUserId.value) {
  if (!userId) {
    selectedAdminPermissionProfile.value = null;
    return;
  }

  adminPermissionLoading.value = true;
  try {
    selectedAdminPermissionUserId.value = userId;
    selectedAdminPermissionProfile.value = await request<AdminPermissionProfile>(
      `/api/users/${userId}/admin-permissions`,
    );
  } finally {
    adminPermissionLoading.value = false;
  }
}

async function updateAdminPermission(permission: AdminPermission, enabled: boolean) {
  const profile = selectedAdminPermissionProfile.value;

  if (!profile) {
    return;
  }

  if (
    !confirmCriticalAction(
      `即将${enabled ? '授予' : '移除'}管理员 ${profile.user.username} 的权限「${
        permission.label
      }」(${permission.key})。\n\n注意：一旦给管理员配置任意 admin.* 权限，该管理员将进入精细权限模式，不再自动继承旧版全权限。`,
    )
  ) {
    return;
  }

  const result = await request<ApprovalActionResult>(
    `/api/users/${profile.user.id}/admin-permissions/${permission.key}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        enabled,
        remark: 'Updated from admin console',
      }),
    },
  );
  message.value = resolveApprovalMessage(result, '管理员权限已更新');
  if (currentUser.value?.id === profile.user.id) {
    currentAdminPermissionProfile.value =
      await request<EffectiveAdminPermissionProfile>('/api/auth/admin-permissions');
    ensureAccessibleAdminView();
  }
  await loadAdminPermissionProfile(profile.user.id);
  await loadAll();
}

async function reviewApproval(approval: ApprovalRequest, status: 'approved' | 'rejected') {
  if (
    !confirmCriticalAction(
      `即将${status === 'approved' ? '通过' : '驳回'}审批单 ${
        approval.requestNo
      }，类型 ${approval.type}，目标 ${approval.targetType ?? '-'} / ${
        approval.targetId ?? '-'
      }。`,
    )
  ) {
    return;
  }

  await request(`/api/approvals/${approval.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      reviewRemark: `Reviewed from admin console: ${status}`,
    }),
  });
  message.value = '审批单状态已更新';
  await loadAll();
}

async function createCategory() {
  if (!categoryForm.value.name.trim()) {
    message.value = '请填写分类名称';
    return;
  }

  await request('/api/catalog/categories', {
    method: 'POST',
    body: JSON.stringify(categoryForm.value),
  });
  categoryForm.value.name = '';
  await loadAll();
}

async function updateProductStatus(
  product: Product,
  status: 'active' | 'hidden' | 'disabled',
) {
  if (
    !confirmCriticalAction(
      `即将把商品「${product.name}」状态从 ${product.status} 调整为 ${status}。`,
    )
  ) {
    return;
  }

  await request(`/api/catalog/products/${product.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  await loadAll();
}

async function updateProductPrice(product: Product, salePrice: number) {
  if (Number.isNaN(salePrice) || salePrice < 0) {
    message.value = '售价必须是大于等于 0 的数字';
    return;
  }

  await request(`/api/catalog/products/${product.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ salePrice }),
  });
  await loadAll();
}

async function updateProductSwitch(
  product: Product,
  key:
    | 'allowSiteSale'
    | 'allowAgentEditPrice'
    | 'allowAgentEditName'
    | 'allowAgentEditDescription',
  enabled: boolean,
) {
  await request(`/api/catalog/products/${product.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ [key]: enabled }),
  });
  await loadAll();
}

async function createProduct() {
  if (!productForm.value.categoryId || !productForm.value.name.trim()) {
    message.value = '请先选择分类并填写商品名称';
    return;
  }

  await request('/api/catalog/products', {
    method: 'POST',
    body: JSON.stringify(productForm.value),
  });
  productForm.value = {
    categoryId: productForm.value.categoryId,
    name: '',
    costPrice: 0,
    defaultWholesalePrice: 0,
    salePrice: 0,
    minSalePrice: 0,
    allowSiteSale: true,
    allowAgentEditPrice: false,
    allowAgentEditName: false,
    allowAgentEditDescription: false,
  };
  await loadAll();
}

async function updateSiteStatus(
  site: Site,
  status: 'active' | 'suspended' | 'banned',
) {
  if (
    !confirmCriticalAction(
      `即将把分站「${site.name}」状态从 ${site.status} 调整为 ${status}。`,
    )
  ) {
    return;
  }

  await request(`/api/sites/${site.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  await loadAll();
}

async function importCards() {
  const cards = inventoryForm.value.cardsText
    .split('\n')
    .map((card) => card.trim())
    .filter(Boolean);

  if (!inventoryForm.value.productId || cards.length === 0) {
    message.value = '请选择商品并输入卡密，一行一条';
    return;
  }

  await request('/api/inventory/cards/import', {
    method: 'POST',
    body: JSON.stringify({
      productId: inventoryForm.value.productId,
      cards,
    }),
  });
  inventoryForm.value.cardsText = '';
  await refreshStock(inventoryForm.value.productId);
  await loadAll();
}

async function refreshStock(productId: string) {
  if (!productId) {
    return;
  }

  stockSnapshots.value[productId] = await request<StockSnapshot>(
    `/api/inventory/products/${productId}/stock`,
  );
}

async function createSite() {
  if (!siteForm.value.ownerUserId || !siteForm.value.name.trim()) {
    message.value = '请填写代理用户和分站名称';
    return;
  }

  await request('/api/sites', {
    method: 'POST',
    body: JSON.stringify({
      ...siteForm.value,
      systemSubdomain: siteForm.value.systemSubdomain || undefined,
    }),
  });
  siteForm.value = {
    ownerUserId: '',
    name: '',
    systemSubdomain: '',
  };
  await loadAll();
}

async function createMySite() {
  if (!mySiteForm.value.name.trim()) {
    message.value = '请填写分站名称';
    return;
  }

  await request('/api/agent/sites', {
    method: 'POST',
    body: JSON.stringify({
      name: mySiteForm.value.name,
      systemSubdomain: mySiteForm.value.systemSubdomain || undefined,
    }),
  });
  mySiteForm.value = {
    name: '',
    systemSubdomain: '',
  };
  message.value = '分站已创建';
  await loadAgentData();
}

async function updateMySite(site: Site) {
  await request(`/api/agent/sites/${site.id}`, {
    method: 'PATCH',
    body: JSON.stringify(editingSites.value[site.id]),
  });
  message.value = '分站信息已保存';
  await loadAgentData();
}

async function bindMyDomain() {
  if (!myDomainForm.value.siteId || !myDomainForm.value.domain.trim()) {
    message.value = '请选择分站并填写域名';
    return;
  }

  await request('/api/agent/sites/domains', {
    method: 'POST',
    body: JSON.stringify(myDomainForm.value),
  });
  myDomainForm.value.domain = '';
  message.value = '域名已提交';
  await loadAgentData();
}

async function refreshAgentSiteOverrides() {
  const entries = await Promise.all(
    agentSites.value.map(async (site) => [
      site.id,
      await request<SiteProductOverride[]>(
        `/api/agent/catalog/sites/${site.id}/overrides`,
      ),
    ]),
  );

  agentSiteOverrides.value = Object.fromEntries(entries);
}

async function upsertMySiteProduct() {
  if (!myProductForm.value.siteId || !myProductForm.value.productId) {
    message.value = '请选择分站和商品';
    return;
  }

  await request('/api/agent/catalog/site-products', {
    method: 'POST',
    body: JSON.stringify({
      ...myProductForm.value,
      customName: myProductForm.value.customName || undefined,
      customDescription: myProductForm.value.customDescription || undefined,
      customCover: myProductForm.value.customCover || undefined,
      customPrice:
        myProductForm.value.customPrice === undefined ||
        Number.isNaN(myProductForm.value.customPrice)
          ? undefined
          : myProductForm.value.customPrice,
    }),
  });

  message.value = '分站商品配置已保存';
  myProductForm.value.customName = '';
  myProductForm.value.customDescription = '';
  myProductForm.value.customCover = '';
  myProductForm.value.customPrice = undefined;
  myProductForm.value.isVisible = true;
  myProductForm.value.sortOrder = 0;
  await refreshAgentSiteOverrides();
}

function getProductOverride(siteId: string, productId: string) {
  return agentSiteOverrides.value[siteId]?.find(
    (override) => override.productId === productId,
  );
}

async function createWithdrawal() {
  if (withdrawalForm.value.amount <= 0) {
    message.value = '提现金额必须大于 0';
    return;
  }

  if (!withdrawalForm.value.accountName.trim() || !withdrawalForm.value.accountNo.trim()) {
    message.value = '请填写收款姓名和收款账号';
    return;
  }

  await request('/api/agent/finance/withdrawals', {
    method: 'POST',
    body: JSON.stringify({
      ...withdrawalForm.value,
      remark: withdrawalForm.value.remark || undefined,
    }),
  });
  withdrawalForm.value = {
    amount: 0,
    accountType: 'alipay',
    accountName: '',
    accountNo: '',
    remark: '',
  };
  message.value = '提现申请已提交';
  await loadAgentData();
}

async function reviewWithdrawal(
  withdrawal: Withdrawal,
  status: 'approved' | 'rejected' | 'paid',
) {
  if (
    !confirmCriticalAction(
      `即将处理提现申请：用户 ${withdrawal.username ?? withdrawal.userId}，金额 ￥${
        withdrawal.amount
      }，收款账号 ${withdrawal.accountType} / ${withdrawal.accountName} / ${
        withdrawal.accountNo
      }，状态 ${withdrawal.status} -> ${status}。`,
    )
  ) {
    return;
  }

  const result = await request<ApprovalActionResult>(
    `/api/finance/withdrawals/${withdrawal.id}`,
    {
    method: 'PATCH',
    body: JSON.stringify({
      status,
    }),
    },
  );
  message.value = resolveApprovalMessage(result, '提现状态已更新');
  await loadAll();
}

async function createSettlement() {
  if (!settlementForm.value.startDate || !settlementForm.value.endDate) {
    message.value = '请选择结算周期';
    return;
  }

  await request('/api/finance/settlements', {
    method: 'POST',
    body: JSON.stringify({
      startDate: `${settlementForm.value.startDate}T00:00:00.000Z`,
      endDate: `${settlementForm.value.endDate}T23:59:59.999Z`,
      userId: settlementForm.value.userId || undefined,
      remark: settlementForm.value.remark || undefined,
    }),
  });
  settlementForm.value = {
    userId: '',
    startDate: '',
    endDate: '',
    remark: '',
  };
  message.value = '结算单已生成，请确认金额后再标记确认';
  await loadAll();
}

async function reviewSettlement(
  settlement: Settlement,
  status: 'confirmed' | 'archived' | 'voided',
) {
  if (
    !confirmCriticalAction(
      `即将处理结算单 ${settlement.settlementNo}：实付金额 ￥${settlement.paidAmount}，提现金额 ￥${settlement.withdrawalAmount}，状态 ${settlement.status} -> ${status}。`,
    )
  ) {
    return;
  }

  const result = await request<ApprovalActionResult>(
    `/api/finance/settlements/${settlement.id}`,
    {
    method: 'PATCH',
    body: JSON.stringify({
      status,
    }),
    },
  );
  message.value = resolveApprovalMessage(result, '结算单状态已更新');
  await loadAll();
}

async function exportSettlements() {
  const response = await fetch('/api/finance/settlements/export', {
    headers: {
      ...(accessToken.value
        ? { Authorization: `Bearer ${accessToken.value}` }
        : {}),
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const csv = await response.blob();
  const url = globalThis.URL.createObjectURL(csv);
  const link = globalThis.document.createElement('a');
  link.href = url;
  link.download = `opencardhub-settlements-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  globalThis.URL.revokeObjectURL(url);
}

function formatAuditDetail(detail?: Record<string, unknown>) {
  return globalThis.JSON.stringify(detail ?? {});
}

function toggleSettlementSnapshot(settlementId: string) {
  expandedSettlementId.value =
    expandedSettlementId.value === settlementId ? '' : settlementId;
}

function toggleAgentSettlementSnapshot(settlementId: string) {
  expandedAgentSettlementId.value =
    expandedAgentSettlementId.value === settlementId ? '' : settlementId;
}

async function loadSettlementDetails(settlementId: string) {
  expandedSettlementId.value =
    expandedSettlementId.value === settlementId ? '' : settlementId;

  if (expandedSettlementId.value && !settlementDetails.value[settlementId]) {
    settlementDetailPagination.value[settlementId] = {
      orderPage: 1,
      withdrawalPage: 1,
    };
    settlementDetails.value[settlementId] = await request<SettlementDetails>(
      `/api/finance/settlements/${settlementId}/details${buildSettlementDetailsQuery(
        settlementDetailPagination.value[settlementId],
      )}`,
    );
  }
}

async function loadAgentSettlementDetails(settlementId: string) {
  expandedAgentSettlementId.value =
    expandedAgentSettlementId.value === settlementId ? '' : settlementId;

  if (
    expandedAgentSettlementId.value &&
    !agentSettlementDetails.value[settlementId]
  ) {
    agentSettlementDetailPagination.value[settlementId] = {
      orderPage: 1,
      withdrawalPage: 1,
    };
    agentSettlementDetails.value[settlementId] =
      await request<SettlementDetails>(
        `/api/agent/finance/settlements/${settlementId}/details${buildSettlementDetailsQuery(
          agentSettlementDetailPagination.value[settlementId],
        )}`,
      );
  }
}

async function changeSettlementDetailPage(
  settlementId: string,
  type: 'orders' | 'withdrawals',
  delta: number,
) {
  const current = settlementDetails.value[settlementId];
  if (!current) {
    return;
  }

  const pagination = settlementDetailPagination.value[settlementId] ?? {
    orderPage: 1,
    withdrawalPage: 1,
  };
  const meta = current[type].meta;
  const nextPage = meta.page + delta;
  if (nextPage < 1 || nextPage > meta.totalPages) {
    return;
  }

  settlementDetailPagination.value[settlementId] = {
    ...pagination,
    [type === 'orders' ? 'orderPage' : 'withdrawalPage']: nextPage,
  };
  settlementDetails.value[settlementId] = await request<SettlementDetails>(
    `/api/finance/settlements/${settlementId}/details${buildSettlementDetailsQuery(
      settlementDetailPagination.value[settlementId],
    )}`,
  );
}

async function changeAgentSettlementDetailPage(
  settlementId: string,
  type: 'orders' | 'withdrawals',
  delta: number,
) {
  const current = agentSettlementDetails.value[settlementId];
  if (!current) {
    return;
  }

  const pagination = agentSettlementDetailPagination.value[settlementId] ?? {
    orderPage: 1,
    withdrawalPage: 1,
  };
  const meta = current[type].meta;
  const nextPage = meta.page + delta;
  if (nextPage < 1 || nextPage > meta.totalPages) {
    return;
  }

  agentSettlementDetailPagination.value[settlementId] = {
    ...pagination,
    [type === 'orders' ? 'orderPage' : 'withdrawalPage']: nextPage,
  };
  agentSettlementDetails.value[settlementId] =
    await request<SettlementDetails>(
      `/api/agent/finance/settlements/${settlementId}/details${buildSettlementDetailsQuery(
        agentSettlementDetailPagination.value[settlementId],
      )}`,
    );
}

function storefrontPreviewUrl(site: Site) {
  const domain = site.domains.find((item) => item.status === 'active');
  return domain ? `http://localhost:5174/?host=${domain.domain}` : '';
}

onMounted(() => {
  if (accessToken.value) {
    void loadAll();
  }
});
</script>

<template>
  <main
    v-if="!accessToken"
    class="login-shell"
  >
    <section class="login-panel">
      <div class="brand login-brand">
        <span class="brand-mark">O</span>
        <div>
          <strong>OpenCardHub</strong>
          <small>Console</small>
        </div>
      </div>
      <h1>登录控制台</h1>
      <p class="login-copy">
        管理员可以配置主站、商品和代理；代理登录后可以管理自己的分站。
      </p>
      <form
        class="form-grid single"
        @submit.prevent="login"
      >
        <label>
          用户名
          <input v-model="loginForm.username">
        </label>
        <label>
          密码
          <input
            v-model="loginForm.password"
            type="password"
          >
        </label>
        <button
          class="solid-button"
          type="submit"
        >
          登录
        </button>
      </form>
      <p
        v-if="message"
        class="message"
      >
        {{ message }}
      </p>
    </section>
  </main>

  <div
    v-else
    class="app-shell"
  >
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">O</span>
        <div>
          <strong>OpenCardHub</strong>
          <small>{{ isAdmin ? 'Admin Console' : 'Agent Console' }}</small>
        </div>
      </div>

      <div class="profile-card">
        <strong>{{ currentUser?.username }}</strong>
        <span>{{ currentUser?.role }} / {{ currentUser?.levelCode }}</span>
      </div>

      <nav class="nav-list">
        <button
          v-for="item in navItems"
          :key="item.key"
          :class="{ active: activeView === item.key }"
          type="button"
          @click="activeView = item.key"
        >
          {{ item.label }}
        </button>
      </nav>
    </aside>

    <main class="workspace">
      <header class="topbar">
        <div>
          <p class="eyebrow">
            配置驱动的虚拟商品分销中台
          </p>
          <h1>{{ currentViewLabel }}</h1>
        </div>
        <div class="topbar-actions">
          <button
            class="ghost-button"
            type="button"
            @click="loadAll"
          >
            刷新
          </button>
          <button
            class="ghost-button"
            type="button"
            @click="logout"
          >
            退出
          </button>
        </div>
      </header>

      <p
        v-if="message"
        class="message"
      >
        {{ message }}
      </p>

      <section
        v-if="activeView === 'overview'"
        class="view-stack"
      >
        <div class="metric-grid">
          <article
            v-for="item in totals"
            :key="item.label"
            class="metric-card"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </div>

        <section class="panel">
          <div class="panel-heading">
            <h2>当前阶段</h2>
            <span>{{ loading ? '加载中' : '已连接后端接口' }}</span>
          </div>
          <div class="timeline">
            <p>已完成：等级能力、配置中心、商品、卡密库存、订单、支付骨架、分站解析、分站商品覆盖、代理自助开站。</p>
            <p>下一步：继续完善代理可配置项、分站商品独立定价、真实支付回调和域名自动化。</p>
          </div>
        </section>
      </section>

      <section
        v-if="activeView === 'approvals'"
        class="view-stack"
      >
        <section class="panel">
          <div class="panel-heading">
            <h2>审批中心</h2>
            <span>{{ approvalRequests.length }} 条审批</span>
          </div>
          <form
            class="form-grid three"
            @submit.prevent="applyApprovalFilter"
          >
            <label>
              状态
              <select v-model="approvalFilter.status">
                <option value="">
                  全部
                </option>
                <option value="pending">
                  待审批
                </option>
                <option value="approved">
                  已通过
                </option>
                <option value="rejected">
                  已驳回
                </option>
              </select>
            </label>
            <label>
              类型
              <input
                v-model="approvalFilter.type"
                placeholder="admin_permission_update / withdrawal_paid"
              >
            </label>
            <button
              class="solid-button"
              type="submit"
            >
              筛选审批
            </button>
          </form>
          <table>
            <thead>
              <tr>
                <th>审批单</th>
                <th>类型</th>
                <th>状态</th>
                <th>申请人</th>
                <th>目标</th>
                <th>内容</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="approval in approvalRequests"
                :key="approval.id"
              >
                <td>{{ approval.requestNo }}</td>
                <td>{{ approval.type }}</td>
                <td>
                  <span :class="['status-pill', approval.status]">
                    {{ approval.status }}
                  </span>
                </td>
                <td>{{ approval.requesterId ?? '-' }}</td>
                <td>{{ approval.targetType ?? '-' }} / {{ approval.targetId ?? '-' }}</td>
                <td>{{ formatAuditDetail(approval.payload) }}</td>
                <td>{{ new Date(approval.createdAt).toLocaleString() }}</td>
                <td>
                  <button
                    class="table-button"
                    type="button"
                    @click="toggleApprovalDetails(approval.id)"
                  >
                    {{ expandedApprovalId === approval.id ? '收起' : '详情' }}
                  </button>
                  <button
                    v-if="approval.status === 'pending'"
                    class="table-button"
                    type="button"
                    @click="reviewApproval(approval, 'approved')"
                  >
                    通过
                  </button>
                  <button
                    v-if="approval.status === 'pending'"
                    class="table-button danger"
                    type="button"
                    @click="reviewApproval(approval, 'rejected')"
                  >
                    驳回
                  </button>
                  <span v-if="approval.status !== 'pending'">
                    {{ approval.reviewedAt ? new Date(approval.reviewedAt).toLocaleString() : '-' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div
            v-if="expandedApproval"
            class="approval-detail"
          >
            <article>
              <strong>申请内容</strong>
              <pre>{{ JSON.stringify(expandedApproval.payload ?? {}, null, 2) }}</pre>
            </article>
            <article>
              <strong>执行结果</strong>
              <pre>{{ JSON.stringify(expandedApproval.result ?? {}, null, 2) }}</pre>
            </article>
            <article>
              <strong>备注</strong>
              <p>{{ expandedApproval.remark ?? '-' }}</p>
              <p>{{ expandedApproval.reviewRemark ?? '-' }}</p>
            </article>
          </div>
          <p
            v-if="approvalRequests.length === 0"
            class="empty-text"
          >
            暂无审批申请。
          </p>
        </section>
      </section>

      <section
        v-if="activeView === 'levels'"
        class="view-stack"
      >
        <section class="panel">
          <div class="panel-heading">
            <h2>等级能力</h2>
            <button
              class="solid-button"
              type="button"
              @click="bootstrapLevels"
            >
              初始化默认能力
            </button>
          </div>

          <div class="level-grid">
            <article
              v-for="level in levels"
              :key="level.level"
              class="level-card"
            >
              <strong>{{ level.level }}</strong>
              <h3>{{ level.name }}</h3>
              <p>{{ level.description }}</p>
              <div class="capability-list">
                <span
                  v-for="capability in level.capabilities"
                  :key="capability.key"
                  :class="{ enabled: capability.enabled }"
                >
                  {{ capability.key }}
                </span>
              </div>
            </article>
          </div>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <h2>能力开关</h2>
            <span>直接控制各等级特权</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>能力项</th>
                <th
                  v-for="level in levels"
                  :key="level.level"
                >
                  {{ level.level }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="key in capabilityKeys"
                :key="key"
              >
                <td>
                  <code>{{ key }}</code>
                </td>
                <td
                  v-for="level in levels"
                  :key="`${level.level}-${key}`"
                >
                  <label class="inline-toggle">
                    <input
                      :checked="Boolean(getLevelCapability(level, key)?.enabled)"
                      type="checkbox"
                      @change="
                        updateLevelCapability(
                          level,
                          key,
                          ($event.target as HTMLInputElement).checked,
                          getLevelCapability(level, key)?.limitValue,
                        )
                      "
                    >
                    启用
                  </label>
                  <input
                    class="limit-input"
                    :value="getLevelCapability(level, key)?.limitValue ?? ''"
                    placeholder="额度"
                    type="number"
                    min="0"
                    @change="
                      updateLevelCapability(
                        level,
                        key,
                        Boolean(getLevelCapability(level, key)?.enabled),
                        ($event.target as HTMLInputElement).value
                          ? Number(($event.target as HTMLInputElement).value)
                          : undefined,
                      )
                    "
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </section>

      <section
        v-if="activeView === 'catalog'"
        class="view-stack two-column"
      >
        <section class="panel">
          <div class="panel-heading">
            <h2>新增分类</h2>
          </div>
          <form
            class="form-grid"
            @submit.prevent="createCategory"
          >
            <label>
              分类名称
              <input v-model="categoryForm.name">
            </label>
            <button
              class="solid-button"
              type="submit"
            >
              创建分类
            </button>
          </form>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <h2>新增商品</h2>
          </div>
          <form
            class="form-grid"
            @submit.prevent="createProduct"
          >
            <label>
              分类
              <select v-model="productForm.categoryId">
                <option value="">
                  请选择
                </option>
                <option
                  v-for="category in categories"
                  :key="category.id"
                  :value="category.id"
                >
                  {{ category.name }}
                </option>
              </select>
            </label>
            <label>
              商品名称
              <input v-model="productForm.name">
            </label>
            <label>
              成本价
              <input
                v-model.number="productForm.costPrice"
                type="number"
                min="0"
                step="0.01"
              >
            </label>
            <label>
              进货价
              <input
                v-model.number="productForm.defaultWholesalePrice"
                type="number"
                min="0"
                step="0.01"
              >
            </label>
            <label>
              售价
              <input
                v-model.number="productForm.salePrice"
                type="number"
                min="0"
                step="0.01"
              >
            </label>
            <label>
              最低售价
              <input
                v-model.number="productForm.minSalePrice"
                type="number"
                min="0"
                step="0.01"
              >
            </label>
            <label class="inline-toggle">
              <input
                v-model="productForm.allowSiteSale"
                type="checkbox"
              >
              允许分站销售
            </label>
            <label class="inline-toggle">
              <input
                v-model="productForm.allowAgentEditPrice"
                type="checkbox"
              >
              允许代理改价
            </label>
            <label class="inline-toggle">
              <input
                v-model="productForm.allowAgentEditName"
                type="checkbox"
              >
              允许代理改名
            </label>
            <label class="inline-toggle">
              <input
                v-model="productForm.allowAgentEditDescription"
                type="checkbox"
              >
              允许代理改描述
            </label>
            <button
              class="solid-button"
              type="submit"
            >
              创建商品
            </button>
          </form>
        </section>

        <section class="panel wide">
          <div class="panel-heading">
            <h2>商品列表</h2>
            <span>{{ products.length }} 个商品</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>商品</th>
                <th>分类</th>
                <th>售价</th>
                <th>进货价</th>
                <th>库存</th>
                <th>状态</th>
                <th>代理配置</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="product in products"
                :key="product.id"
              >
                <td>{{ product.name }}</td>
                <td>{{ product.category?.name ?? '-' }}</td>
                <td>
                  <input
                    class="table-input"
                    :value="product.salePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    @change="
                      updateProductPrice(
                        product,
                        Number(($event.target as HTMLInputElement).value),
                      )
                    "
                  >
                </td>
                <td>{{ product.defaultWholesalePrice }}</td>
                <td>{{ product.stockCount }}</td>
                <td>{{ product.status }}</td>
                <td>
                  <label class="inline-toggle compact">
                    <input
                      :checked="Boolean(product.allowSiteSale)"
                      type="checkbox"
                      @change="
                        updateProductSwitch(
                          product,
                          'allowSiteSale',
                          ($event.target as HTMLInputElement).checked,
                        )
                      "
                    >
                    分站销售
                  </label>
                  <label class="inline-toggle compact">
                    <input
                      :checked="Boolean(product.allowAgentEditPrice)"
                      type="checkbox"
                      @change="
                        updateProductSwitch(
                          product,
                          'allowAgentEditPrice',
                          ($event.target as HTMLInputElement).checked,
                        )
                      "
                    >
                    改价
                  </label>
                  <label class="inline-toggle compact">
                    <input
                      :checked="Boolean(product.allowAgentEditName)"
                      type="checkbox"
                      @change="
                        updateProductSwitch(
                          product,
                          'allowAgentEditName',
                          ($event.target as HTMLInputElement).checked,
                        )
                      "
                    >
                    改名
                  </label>
                  <label class="inline-toggle compact">
                    <input
                      :checked="Boolean(product.allowAgentEditDescription)"
                      type="checkbox"
                      @change="
                        updateProductSwitch(
                          product,
                          'allowAgentEditDescription',
                          ($event.target as HTMLInputElement).checked,
                        )
                      "
                    >
                    改描述
                  </label>
                </td>
                <td>
                  <button
                    class="table-button"
                    type="button"
                    @click="
                      updateProductStatus(
                        product,
                        product.status === 'active' ? 'hidden' : 'active',
                      )
                    "
                  >
                    {{ product.status === 'active' ? '隐藏' : '上架' }}
                  </button>
                  <button
                    class="table-button danger"
                    type="button"
                    @click="updateProductStatus(product, 'disabled')"
                  >
                    禁用
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </section>

      <section
        v-if="activeView === 'users'"
        class="view-stack two-column"
      >
        <section class="panel">
          <div class="panel-heading">
            <h2>创建用户</h2>
          </div>
          <form
            class="form-grid"
            @submit.prevent="createUser"
          >
            <label>
              用户名
              <input v-model="userForm.username">
            </label>
            <label>
              初始密码
              <input
                v-model="userForm.password"
                type="password"
              >
            </label>
            <label>
              等级
              <select v-model="userForm.levelCode">
                <option value="V0">
                  V0 普通用户
                </option>
                <option value="V1">
                  V1 一级代理
                </option>
                <option value="V2">
                  V2 二级代理
                </option>
              </select>
            </label>
            <label>
              角色
              <select v-model="userForm.role">
                <option value="buyer">
                  buyer 买家
                </option>
                <option value="agent">
                  agent 代理
                </option>
                <option value="admin">
                  admin 管理员
                </option>
              </select>
            </label>
            <button
              class="solid-button"
              type="submit"
            >
              创建用户
            </button>
          </form>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <h2>用户列表</h2>
            <span>{{ users.length }} 个用户</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>角色</th>
                <th>等级</th>
                <th>余额</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in users"
                :key="user.id"
              >
                <td>{{ user.id }}</td>
                <td>{{ user.username }}</td>
                <td>{{ user.role }}</td>
                <td>{{ user.levelCode }}</td>
                <td>{{ user.balance ?? 0 }}</td>
                <td>{{ user.status }}</td>
                <td>
                  <button
                    class="table-button"
                    type="button"
                    @click="
                      updateUserStatus(
                        user,
                        user.status === 'active' ? 'disabled' : 'active',
                      )
                    "
                  >
                    {{ user.status === 'active' ? '禁用' : '启用' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="panel wide">
          <div class="panel-heading">
            <h2>管理员权限配置</h2>
            <span>{{ adminPermissionOptions.length }} 个权限点</span>
          </div>

          <div class="permission-toolbar">
            <label>
              选择管理员
              <select
                v-model="selectedAdminPermissionUserId"
                @change="loadAdminPermissionProfile()"
              >
                <option value="">
                  请选择管理员
                </option>
                <option
                  v-for="user in adminUsers"
                  :key="user.id"
                  :value="user.id"
                >
                  {{ user.username }} / ID {{ user.id }}
                </option>
              </select>
            </label>
            <p>
              未配置任何 admin.* 权限时，该管理员仍按旧版兼容逻辑拥有完整后台权限；一旦配置任意权限，将切换为精细权限模式。
            </p>
          </div>

          <div
            v-if="selectedAdminPermissionProfile"
            class="permission-summary"
          >
            <strong>{{ selectedAdminPermissionProfile.user.username }}</strong>
            <span>
              {{
                selectedAdminPermissionProfile.legacyFullAccess
                  ? '兼容全权限：尚未显式配置 admin.* 权限'
                  : '精细权限模式：仅允许已启用权限'
              }}
            </span>
          </div>

          <div
            v-if="selectedAdminPermissionProfile"
            class="permission-grid"
          >
            <article
              v-for="permission in selectedAdminPermissionProfile.permissions"
              :key="permission.key"
              class="permission-card"
              :class="{
                enabled: permission.enabled,
                high: permission.riskLevel === 'high',
              }"
            >
              <div>
                <strong>{{ permission.label }}</strong>
                <code>{{ permission.key }}</code>
                <p>{{ permission.description }}</p>
              </div>
              <label class="inline-toggle">
                <input
                  :checked="permission.enabled"
                  type="checkbox"
                  :disabled="adminPermissionLoading"
                  @change="
                    updateAdminPermission(
                      permission,
                      ($event.target as HTMLInputElement).checked,
                    )
                  "
                >
                {{ permission.enabled ? '已启用' : '未启用' }}
              </label>
            </article>
          </div>

          <p
            v-else
            class="empty-text"
          >
            请选择一个管理员账号后配置后台权限。
          </p>
        </section>
      </section>

      <section
        v-if="activeView === 'sites'"
        class="view-stack"
      >
        <section class="panel">
          <div class="panel-heading">
            <h2>创建分站</h2>
          </div>
          <form
            class="form-grid three"
            @submit.prevent="createSite"
          >
            <label>
              代理用户
              <select v-model="siteForm.ownerUserId">
                <option value="">
                  请选择
                </option>
                <option
                  v-for="user in agentUsers"
                  :key="user.id"
                  :value="user.id"
                >
                  {{ user.username }} / {{ user.levelCode }} / ID {{ user.id }}
                </option>
              </select>
            </label>
            <label>
              分站名称
              <input v-model="siteForm.name">
            </label>
            <label>
              系统子域名
              <input
                v-model="siteForm.systemSubdomain"
                placeholder="agent.example.com"
              >
            </label>
            <button
              class="solid-button"
              type="submit"
            >
              创建分站
            </button>
          </form>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <h2>分站列表</h2>
            <span>{{ sites.length }} 个分站</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>分站</th>
                <th>代理用户</th>
                <th>域名</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="site in sites"
                :key="site.id"
              >
                <td>{{ site.name }}</td>
                <td>{{ site.ownerUserId }}</td>
                <td>
                  <span
                    v-for="domain in site.domains"
                    :key="domain.domain"
                    class="domain-pill"
                  >
                    {{ domain.domain }}
                  </span>
                </td>
                <td>{{ site.status }}</td>
                <td>
                  <button
                    class="table-button"
                    type="button"
                    @click="
                      updateSiteStatus(
                        site,
                        site.status === 'active' ? 'suspended' : 'active',
                      )
                    "
                  >
                    {{ site.status === 'active' ? '暂停' : '启用' }}
                  </button>
                  <button
                    class="table-button danger"
                    type="button"
                    @click="updateSiteStatus(site, 'banned')"
                  >
                    封禁
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </section>

      <section
        v-if="activeView === 'inventory'"
        class="view-stack two-column"
      >
        <section class="panel">
          <div class="panel-heading">
            <h2>导入卡密</h2>
          </div>
          <form
            class="form-grid single"
            @submit.prevent="importCards"
          >
            <label>
              商品
              <select
                v-model="inventoryForm.productId"
                @change="refreshStock(inventoryForm.productId)"
              >
                <option value="">
                  请选择
                </option>
                <option
                  v-for="product in products"
                  :key="product.id"
                  :value="product.id"
                >
                  {{ product.name }} / 库存 {{ product.stockCount }}
                </option>
              </select>
            </label>
            <label>
              卡密内容
              <textarea
                v-model="inventoryForm.cardsText"
                placeholder="一行一条卡密"
              />
            </label>
            <button
              class="solid-button"
              type="submit"
            >
              导入卡密
            </button>
          </form>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <h2>库存状态</h2>
            <button
              class="ghost-button"
              type="button"
              @click="refreshStock(inventoryForm.productId)"
            >
              查看库存
            </button>
          </div>
          <div
            v-if="inventoryForm.productId && stockSnapshots[inventoryForm.productId]"
            class="stock-grid"
          >
            <article
              v-for="(count, status) in stockSnapshots[inventoryForm.productId].counts"
              :key="status"
              class="metric-card"
            >
              <span>{{ status }}</span>
              <strong>{{ count }}</strong>
            </article>
          </div>
          <p
            v-else
            class="empty-text"
          >
            选择商品后查看库存状态。
          </p>
        </section>
      </section>

      <section
        v-if="activeView === 'finance'"
        class="view-stack"
      >
        <div class="metric-grid">
          <article class="metric-card">
            <span>待审核提现</span>
            <strong>{{ adminFinanceSummary.pendingCount }}</strong>
          </article>
          <article class="metric-card">
            <span>待审核金额</span>
            <strong>￥{{ adminFinanceSummary.pendingAmount }}</strong>
          </article>
          <article class="metric-card">
            <span>待打款金额</span>
            <strong>￥{{ adminFinanceSummary.approvedAmount }}</strong>
          </article>
          <article class="metric-card">
            <span>已打款金额</span>
            <strong>￥{{ adminFinanceSummary.paidAmount }}</strong>
          </article>
        </div>

        <section class="panel">
          <div class="panel-heading">
            <h2>本期对账</h2>
            <span>按支付时间汇总订单利润，按申请时间汇总提现</span>
          </div>
          <form
            class="form-grid three"
            @submit.prevent="loadFinanceReports"
          >
            <label>
              开始日期
              <input
                v-model="financeReportFilter.startDate"
                type="date"
              >
            </label>
            <label>
              结束日期
              <input
                v-model="financeReportFilter.endDate"
                type="date"
              >
            </label>
            <button
              class="solid-button"
              type="submit"
            >
              刷新对账
            </button>
          </form>
          <div class="metric-grid compact">
            <article class="metric-card">
              <span>已支付订单</span>
              <strong>{{ adminFinanceReport.orders.paidCount }}</strong>
            </article>
            <article class="metric-card">
              <span>成交金额</span>
              <strong>￥{{ adminFinanceReport.orders.paidAmount }}</strong>
            </article>
            <article class="metric-card">
              <span>代理分润</span>
              <strong>￥{{ adminFinanceReport.orders.agentProfit }}</strong>
            </article>
            <article class="metric-card">
              <span>平台利润</span>
              <strong>￥{{ adminFinanceReport.orders.platformProfit }}</strong>
            </article>
            <article class="metric-card">
              <span>直销订单</span>
              <strong>{{ adminFinanceReport.orders.directCount }}</strong>
            </article>
            <article class="metric-card">
              <span>分站订单</span>
              <strong>{{ adminFinanceReport.orders.agentCount }}</strong>
            </article>
            <article class="metric-card">
              <span>本期已打款</span>
              <strong>￥{{ adminFinanceReport.withdrawals.paidAmount }}</strong>
            </article>
            <article class="metric-card">
              <span>本期待审核</span>
              <strong>￥{{ adminFinanceReport.withdrawals.pendingAmount }}</strong>
            </article>
          </div>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <h2>结算单</h2>
            <span>生成后会锁定周期快照，确认前请核对订单、分润和提现金额</span>
            <button
              class="table-button"
              type="button"
              @click="exportSettlements"
            >
              导出 CSV
            </button>
          </div>
          <form
            class="form-grid four"
            @submit.prevent="createSettlement"
          >
            <label>
              结算对象
              <select v-model="settlementForm.userId">
                <option value="">
                  全平台
                </option>
                <option
                  v-for="user in agentUsers"
                  :key="user.id"
                  :value="user.id"
                >
                  {{ user.username }} / {{ user.levelCode }}
                </option>
              </select>
            </label>
            <label>
              开始日期
              <input
                v-model="settlementForm.startDate"
                type="date"
              >
            </label>
            <label>
              结束日期
              <input
                v-model="settlementForm.endDate"
                type="date"
              >
            </label>
            <label>
              备注
              <input v-model="settlementForm.remark">
            </label>
            <button
              class="solid-button"
              type="submit"
            >
              生成结算单
            </button>
          </form>
          <table>
            <thead>
              <tr>
                <th>结算号</th>
                <th>对象</th>
                <th>周期</th>
                <th>状态</th>
                <th>订单</th>
                <th>成交</th>
                <th>代理分润</th>
                <th>平台利润</th>
                <th>已打款</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="settlement in adminSettlements"
                :key="settlement.id"
              >
                <td>{{ settlement.settlementNo }}</td>
                <td>{{ settlement.username ?? settlement.settlementScope }}</td>
                <td>
                  {{ new Date(settlement.periodStart).toLocaleDateString() }}
                  -
                  {{ new Date(settlement.periodEnd).toLocaleDateString() }}
                </td>
                <td>{{ settlement.status }}</td>
                <td>{{ settlement.paidOrderCount }}</td>
                <td>￥{{ settlement.paidAmount }}</td>
                <td>￥{{ settlement.agentProfit }}</td>
                <td>￥{{ settlement.platformProfit }}</td>
                <td>￥{{ settlement.withdrawalAmount }}</td>
                <td>
                  <button
                    class="table-button"
                    type="button"
                    @click="toggleSettlementSnapshot(settlement.id)"
                  >
                    快照
                  </button>
                  <button
                    class="table-button"
                    type="button"
                    @click="loadSettlementDetails(settlement.id)"
                  >
                    明细
                  </button>
                  <button
                    v-if="settlement.status === 'draft'"
                    class="table-button"
                    type="button"
                    @click="reviewSettlement(settlement, 'confirmed')"
                  >
                    确认
                  </button>
                  <button
                    v-if="settlement.status === 'confirmed'"
                    class="table-button"
                    type="button"
                    @click="reviewSettlement(settlement, 'archived')"
                  >
                    归档
                  </button>
                  <button
                    v-if="settlement.status === 'draft' || settlement.status === 'confirmed'"
                    class="table-button danger"
                    type="button"
                    @click="reviewSettlement(settlement, 'voided')"
                  >
                    作废
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div
            v-if="expandedSettlement"
            class="settlement-snapshot"
          >
            <div class="panel-heading subtle">
              <h3>结算快照：{{ expandedSettlement.settlementNo }}</h3>
              <span>
                生成于
                {{ expandedSettlement.snapshot?.generatedAt ? new Date(expandedSettlement.snapshot.generatedAt).toLocaleString() : '-' }}
              </span>
            </div>
            <div class="metric-grid compact">
              <article class="metric-card">
                <span>快照订单数</span>
                <strong>{{ expandedSettlement.snapshot?.orders?.paidCount ?? expandedSettlement.paidOrderCount }}</strong>
              </article>
              <article class="metric-card">
                <span>快照成交</span>
                <strong>￥{{ expandedSettlement.snapshot?.orders?.paidAmount ?? expandedSettlement.paidAmount }}</strong>
              </article>
              <article class="metric-card">
                <span>快照成本</span>
                <strong>￥{{ expandedSettlement.snapshot?.orders?.costAmount ?? expandedSettlement.costAmount }}</strong>
              </article>
              <article class="metric-card">
                <span>快照代理分润</span>
                <strong>￥{{ expandedSettlement.snapshot?.orders?.agentProfit ?? expandedSettlement.agentProfit }}</strong>
              </article>
              <article class="metric-card">
                <span>快照平台利润</span>
                <strong>￥{{ expandedSettlement.snapshot?.orders?.platformProfit ?? expandedSettlement.platformProfit }}</strong>
              </article>
              <article class="metric-card">
                <span>快照已打款</span>
                <strong>￥{{ expandedSettlement.snapshot?.withdrawals?.paidAmount ?? expandedSettlement.withdrawalAmount }}</strong>
              </article>
            </div>
            <div v-if="settlementDetails[expandedSettlement.id]">
              <div class="panel-heading subtle">
                <h3>订单明细</h3>
                <span>{{ settlementDetails[expandedSettlement.id].orders.meta.total }} 笔订单</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>订单号</th>
                    <th>代理</th>
                    <th>分站</th>
                    <th>商品</th>
                    <th>数量</th>
                    <th>成交</th>
                    <th>成本</th>
                    <th>代理分润</th>
                    <th>平台利润</th>
                    <th>支付时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="order in settlementDetails[expandedSettlement.id].orders.items"
                    :key="order.id"
                  >
                    <td>{{ order.orderNo }}</td>
                    <td>{{ order.agentUsername ?? '-' }}</td>
                    <td>{{ order.siteName ?? '-' }}</td>
                    <td>{{ order.productName ?? '-' }}</td>
                    <td>{{ order.quantity }}</td>
                    <td>￥{{ order.totalAmount }}</td>
                    <td>￥{{ order.costAmount }}</td>
                    <td>￥{{ order.agentProfit }}</td>
                    <td>￥{{ order.platformProfit }}</td>
                    <td>{{ order.paidAt ? new Date(order.paidAt).toLocaleString() : '-' }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="pagination-bar">
                <button
                  class="table-button"
                  type="button"
                  :disabled="settlementDetails[expandedSettlement.id].orders.meta.page <= 1"
                  @click="changeSettlementDetailPage(expandedSettlement.id, 'orders', -1)"
                >
                  上一页
                </button>
                <span>
                  第 {{ settlementDetails[expandedSettlement.id].orders.meta.page }} /
                  {{ settlementDetails[expandedSettlement.id].orders.meta.totalPages }} 页
                </span>
                <button
                  class="table-button"
                  type="button"
                  :disabled="settlementDetails[expandedSettlement.id].orders.meta.page >= settlementDetails[expandedSettlement.id].orders.meta.totalPages"
                  @click="changeSettlementDetailPage(expandedSettlement.id, 'orders', 1)"
                >
                  下一页
                </button>
              </div>
              <div class="panel-heading subtle">
                <h3>提现明细</h3>
                <span>{{ settlementDetails[expandedSettlement.id].withdrawals.meta.total }} 笔已打款</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>代理</th>
                    <th>金额</th>
                    <th>账号</th>
                    <th>备注</th>
                    <th>打款时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="withdrawal in settlementDetails[expandedSettlement.id].withdrawals.items"
                    :key="withdrawal.id"
                  >
                    <td>{{ withdrawal.username }}</td>
                    <td>￥{{ withdrawal.amount }}</td>
                    <td>{{ withdrawal.accountType }} / {{ withdrawal.accountName }} / {{ withdrawal.accountNo }}</td>
                    <td>{{ withdrawal.reviewRemark ?? '-' }}</td>
                    <td>{{ withdrawal.paidAt ? new Date(withdrawal.paidAt).toLocaleString() : '-' }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="pagination-bar">
                <button
                  class="table-button"
                  type="button"
                  :disabled="settlementDetails[expandedSettlement.id].withdrawals.meta.page <= 1"
                  @click="changeSettlementDetailPage(expandedSettlement.id, 'withdrawals', -1)"
                >
                  上一页
                </button>
                <span>
                  第 {{ settlementDetails[expandedSettlement.id].withdrawals.meta.page }} /
                  {{ settlementDetails[expandedSettlement.id].withdrawals.meta.totalPages }} 页
                </span>
                <button
                  class="table-button"
                  type="button"
                  :disabled="settlementDetails[expandedSettlement.id].withdrawals.meta.page >= settlementDetails[expandedSettlement.id].withdrawals.meta.totalPages"
                  @click="changeSettlementDetailPage(expandedSettlement.id, 'withdrawals', 1)"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
          <p
            v-if="adminSettlements.length === 0"
            class="empty-text"
          >
            暂无结算单。
          </p>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <h2>财务审计日志</h2>
            <span>共 {{ auditLogs.meta.total }} 条资金相关操作</span>
          </div>
          <form
            class="form-grid four"
            @submit.prevent="applyAuditLogFilter"
          >
            <label>
              动作
              <input
                v-model="auditLogFilter.action"
                placeholder="finance.settlement"
              >
            </label>
            <label>
              对象类型
              <input
                v-model="auditLogFilter.targetType"
                placeholder="settlement / withdrawal"
              >
            </label>
            <label>
              对象 ID
              <input v-model="auditLogFilter.targetId">
            </label>
            <button
              class="solid-button"
              type="submit"
            >
              筛选日志
            </button>
          </form>
          <table>
            <thead>
              <tr>
                <th>动作</th>
                <th>操作人</th>
                <th>IP</th>
                <th>对象</th>
                <th>详情</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="log in auditLogs.items"
                :key="log.id"
              >
                <td>{{ log.action }}</td>
                <td>{{ log.userId ?? '-' }}</td>
                <td>{{ log.ip ?? '-' }}</td>
                <td>{{ log.targetType ?? '-' }} / {{ log.targetId ?? '-' }}</td>
                <td>{{ formatAuditDetail(log.detail) }}</td>
                <td>{{ new Date(log.createdAt).toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
          <div class="pagination-bar">
            <button
              class="table-button"
              type="button"
              :disabled="auditLogs.meta.page <= 1"
              @click="changeAuditLogPage(-1)"
            >
              上一页
            </button>
            <span>
              第 {{ auditLogs.meta.page }} / {{ auditLogs.meta.totalPages }} 页
            </span>
            <button
              class="table-button"
              type="button"
              :disabled="auditLogs.meta.page >= auditLogs.meta.totalPages"
              @click="changeAuditLogPage(1)"
            >
              下一页
            </button>
          </div>
          <p
            v-if="auditLogs.items.length === 0"
            class="empty-text"
          >
            暂无财务审计日志。
          </p>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <h2>提现审核</h2>
            <span>{{ adminWithdrawals.length }} 条提现申请</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>代理</th>
                <th>金额</th>
                <th>账号</th>
                <th>状态</th>
                <th>备注</th>
                <th>申请时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="withdrawal in adminWithdrawals"
                :key="withdrawal.id"
              >
                <td>{{ withdrawal.username ?? withdrawal.userId }}</td>
                <td>￥{{ withdrawal.amount }}</td>
                <td>{{ withdrawal.accountType }} / {{ withdrawal.accountName }} / {{ withdrawal.accountNo }}</td>
                <td>{{ withdrawal.status }}</td>
                <td>{{ withdrawal.remark ?? '-' }}</td>
                <td>{{ new Date(withdrawal.createdAt).toLocaleString() }}</td>
                <td>
                  <button
                    v-if="withdrawal.status === 'pending'"
                    class="table-button"
                    type="button"
                    @click="reviewWithdrawal(withdrawal, 'approved')"
                  >
                    通过
                  </button>
                  <button
                    v-if="withdrawal.status === 'approved'"
                    class="table-button"
                    type="button"
                    @click="reviewWithdrawal(withdrawal, 'paid')"
                  >
                    标记已打款
                  </button>
                  <button
                    v-if="withdrawal.status === 'pending' || withdrawal.status === 'approved'"
                    class="table-button danger"
                    type="button"
                    @click="reviewWithdrawal(withdrawal, 'rejected')"
                  >
                    驳回
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <p
            v-if="adminWithdrawals.length === 0"
            class="empty-text"
          >
            暂无提现申请。
          </p>
        </section>
      </section>

      <section
        v-if="activeView === 'agent-sites'"
        class="view-stack"
      >
        <section class="panel">
          <div class="panel-heading">
            <h2>创建我的分站</h2>
            <span>是否可创建、可创建几个，由主站等级能力控制</span>
          </div>
          <form
            class="form-grid three"
            @submit.prevent="createMySite"
          >
            <label>
              分站名称
              <input
                v-model="mySiteForm.name"
                placeholder="例如：小张自动发卡站"
              >
            </label>
            <label>
              系统子域名
              <input
                v-model="mySiteForm.systemSubdomain"
                placeholder="agent.example.com"
              >
            </label>
            <button
              class="solid-button"
              type="submit"
            >
              一键开分站
            </button>
          </form>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <h2>绑定域名</h2>
            <span>系统子域名会自动启用，自定义域名默认待审核</span>
          </div>
          <form
            class="form-grid three"
            @submit.prevent="bindMyDomain"
          >
            <label>
              选择分站
              <select v-model="myDomainForm.siteId">
                <option value="">
                  请选择
                </option>
                <option
                  v-for="site in agentSites"
                  :key="site.id"
                  :value="site.id"
                >
                  {{ site.name }}
                </option>
              </select>
            </label>
            <label>
              域名
              <input
                v-model="myDomainForm.domain"
                placeholder="shop.example.com"
              >
            </label>
            <label>
              类型
              <select v-model="myDomainForm.type">
                <option value="system_sub">
                  系统子域名
                </option>
                <option value="custom">
                  自定义域名
                </option>
              </select>
            </label>
            <button
              class="solid-button"
              type="submit"
            >
              绑定域名
            </button>
          </form>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <h2>我的分站</h2>
            <span>{{ agentSites.length }} 个分站</span>
          </div>
          <div class="product-config-block">
            <section class="sub-panel">
              <div class="panel-heading">
                <h2>分站商品配置</h2>
                <span>自定义项会受等级能力和商品规则共同限制</span>
              </div>
              <form
                class="form-grid three"
                @submit.prevent="upsertMySiteProduct"
              >
                <label>
                  选择分站
                  <select v-model="myProductForm.siteId">
                    <option value="">
                      请选择
                    </option>
                    <option
                      v-for="site in agentSites"
                      :key="site.id"
                      :value="site.id"
                    >
                      {{ site.name }}
                    </option>
                  </select>
                </label>
                <label>
                  选择商品
                  <select v-model="myProductForm.productId">
                    <option value="">
                      请选择
                    </option>
                    <option
                      v-for="product in agentProducts"
                      :key="product.id"
                      :value="product.id"
                    >
                      {{ product.name }} / 最低￥{{ product.minSalePrice }}
                    </option>
                  </select>
                </label>
                <label>
                  展示状态
                  <select v-model="myProductForm.isVisible">
                    <option :value="true">
                      展示
                    </option>
                    <option :value="false">
                      隐藏
                    </option>
                  </select>
                </label>
                <label>
                  自定义名称
                  <input
                    v-model="myProductForm.customName"
                    placeholder="留空使用主站商品名称"
                  >
                </label>
                <label>
                  自定义售价
                  <input
                    v-model.number="myProductForm.customPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="留空使用主站售价"
                  >
                </label>
                <label>
                  排序
                  <input
                    v-model.number="myProductForm.sortOrder"
                    type="number"
                    step="1"
                  >
                </label>
                <label class="wide">
                  自定义封面
                  <input
                    v-model="myProductForm.customCover"
                    placeholder="图片 URL，留空使用主站封面"
                  >
                </label>
                <label class="wide">
                  自定义描述
                  <textarea
                    v-model="myProductForm.customDescription"
                    placeholder="留空使用主站商品描述"
                  />
                </label>
                <button
                  class="solid-button"
                  type="submit"
                >
                  保存商品配置
                </button>
              </form>
            </section>

            <section class="sub-panel">
              <div class="panel-heading">
                <h2>我的货架</h2>
                <span>{{ agentProducts.length }} 个可分销商品</span>
              </div>
              <div class="product-grid">
                <article
                  v-for="product in agentProducts"
                  :key="product.id"
                  class="product-card"
                >
                  <div>
                    <strong>{{ product.name }}</strong>
                    <span>{{ product.category?.name ?? '未分类' }}</span>
                  </div>
                  <p>{{ product.description ?? '暂无描述' }}</p>
                  <dl>
                    <div>
                      <dt>主站售价</dt>
                      <dd>￥{{ product.salePrice }}</dd>
                    </div>
                    <div>
                      <dt>最低售价</dt>
                      <dd>￥{{ product.minSalePrice }}</dd>
                    </div>
                    <div>
                      <dt>库存</dt>
                      <dd>{{ product.stockCount }}</dd>
                    </div>
                  </dl>
                  <div class="capability-list">
                    <span :class="{ enabled: product.allowAgentEditName }">
                      改名 {{ product.allowAgentEditName ? '允许' : '禁止' }}
                    </span>
                    <span :class="{ enabled: product.allowAgentEditPrice }">
                      改价 {{ product.allowAgentEditPrice ? '允许' : '禁止' }}
                    </span>
                    <span :class="{ enabled: product.allowAgentEditDescription }">
                      改描述 {{ product.allowAgentEditDescription ? '允许' : '禁止' }}
                    </span>
                  </div>
                  <div
                    v-if="myProductForm.siteId && getProductOverride(myProductForm.siteId, product.id)"
                    class="override-note"
                  >
                    已配置：
                    {{ getProductOverride(myProductForm.siteId, product.id)?.customName ?? product.name }}
                    /
                    ￥{{ getProductOverride(myProductForm.siteId, product.id)?.customPrice ?? product.salePrice }}
                  </div>
                </article>
              </div>
            </section>
          </div>

          <div class="site-card-grid">
            <article
              v-for="site in agentSites"
              :key="site.id"
              class="site-card"
            >
              <div class="site-card-head">
                <div>
                  <strong>{{ site.name }}</strong>
                  <span>{{ site.status }}</span>
                </div>
                <a
                  v-if="storefrontPreviewUrl(site)"
                  :href="storefrontPreviewUrl(site)"
                  target="_blank"
                  rel="noreferrer"
                >
                  预览分站
                </a>
              </div>

              <div class="domain-row">
                <span
                  v-for="domain in site.domains"
                  :key="domain.domain"
                  class="domain-pill"
                >
                  {{ domain.domain }} / {{ domain.status }}
                </span>
              </div>

              <form
                class="form-grid"
                @submit.prevent="updateMySite(site)"
              >
                <label>
                  分站名称
                  <input v-model="editingSites[site.id].name">
                </label>
                <label>
                  Logo
                  <input v-model="editingSites[site.id].logo">
                </label>
                <label>
                  SEO 标题
                  <input v-model="editingSites[site.id].seoTitle">
                </label>
                <label>
                  SEO 关键词
                  <input v-model="editingSites[site.id].seoKeywords">
                </label>
                <label class="wide">
                  SEO 描述
                  <input v-model="editingSites[site.id].seoDescription">
                </label>
                <label class="wide">
                  分站公告
                  <textarea
                    v-model="editingSites[site.id].notice"
                    placeholder="展示给买家的公告"
                  />
                </label>
                <button
                  class="solid-button"
                  type="submit"
                >
                  保存分站配置
                </button>
              </form>
            </article>
          </div>
          <p
            v-if="agentSites.length === 0"
            class="empty-text"
          >
            暂无分站。创建权限由主站管理员在 V1/V2 能力中配置。
          </p>
        </section>
      </section>

      <section
        v-if="activeView === 'agent-orders'"
        class="view-stack"
      >
        <div class="metric-grid">
          <article class="metric-card">
            <span>订单总数</span>
            <strong>{{ agentOrderSummary.totalOrders }}</strong>
          </article>
          <article class="metric-card">
            <span>已支付订单</span>
            <strong>{{ agentOrderSummary.paidOrders }}</strong>
          </article>
          <article class="metric-card">
            <span>已支付金额</span>
            <strong>￥{{ agentOrderSummary.paidAmount }}</strong>
          </article>
          <article class="metric-card">
            <span>我的利润</span>
            <strong>￥{{ agentOrderSummary.agentProfit }}</strong>
          </article>
        </div>

        <section class="panel">
          <div class="panel-heading">
            <h2>订单明细</h2>
            <span>平台利润 ￥{{ agentOrderSummary.platformProfit }}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>订单号</th>
                <th>分站</th>
                <th>商品</th>
                <th>数量</th>
                <th>金额</th>
                <th>我的利润</th>
                <th>支付</th>
                <th>发货</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="order in agentOrders"
                :key="order.id"
              >
                <td>{{ order.orderNo }}</td>
                <td>{{ order.siteName ?? '-' }}</td>
                <td>{{ order.productName ?? '-' }}</td>
                <td>{{ order.quantity }}</td>
                <td>￥{{ order.totalAmount }}</td>
                <td>￥{{ order.agentProfit }}</td>
                <td>{{ order.paymentStatus }}</td>
                <td>{{ order.deliveryStatus }}</td>
                <td>{{ new Date(order.createdAt).toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
          <p
            v-if="agentOrders.length === 0"
            class="empty-text"
          >
            暂无订单。买家在你的分站下单并支付后，会在这里显示订单和利润。
          </p>
        </section>
      </section>

      <section
        v-if="activeView === 'agent-finance'"
        class="view-stack"
      >
        <div class="metric-grid">
          <article class="metric-card">
            <span>可提现余额</span>
            <strong>￥{{ agentFinanceSummary.balance }}</strong>
          </article>
          <article class="metric-card">
            <span>累计收益</span>
            <strong>￥{{ agentFinanceSummary.totalProfit }}</strong>
          </article>
          <article class="metric-card">
            <span>待处理提现</span>
            <strong>￥{{ agentFinanceSummary.pendingWithdrawalAmount }}</strong>
          </article>
          <article class="metric-card">
            <span>提现记录</span>
            <strong>{{ agentWithdrawals.length }}</strong>
          </article>
        </div>

        <section class="panel">
          <div class="panel-heading">
            <h2>我的本期对账</h2>
            <span>按订单支付时间和打款时间统计</span>
          </div>
          <form
            class="form-grid three"
            @submit.prevent="loadFinanceReports"
          >
            <label>
              开始日期
              <input
                v-model="financeReportFilter.startDate"
                type="date"
              >
            </label>
            <label>
              结束日期
              <input
                v-model="financeReportFilter.endDate"
                type="date"
              >
            </label>
            <button
              class="solid-button"
              type="submit"
            >
              刷新对账
            </button>
          </form>
          <div class="metric-grid compact">
            <article class="metric-card">
              <span>已支付订单</span>
              <strong>{{ agentFinanceReport.orders.paidCount }}</strong>
            </article>
            <article class="metric-card">
              <span>成交金额</span>
              <strong>￥{{ agentFinanceReport.orders.paidAmount }}</strong>
            </article>
            <article class="metric-card">
              <span>应得利润</span>
              <strong>￥{{ agentFinanceReport.orders.agentProfit }}</strong>
            </article>
            <article class="metric-card">
              <span>已入账利润</span>
              <strong>￥{{ agentFinanceReport.profit.creditedAmount }}</strong>
            </article>
            <article class="metric-card">
              <span>已打款金额</span>
              <strong>￥{{ agentFinanceReport.withdrawals.paidAmount }}</strong>
            </article>
            <article class="metric-card">
              <span>已打款次数</span>
              <strong>{{ agentFinanceReport.withdrawals.paidCount }}</strong>
            </article>
          </div>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <h2>我的结算单</h2>
            <span>主站确认后的周期对账快照</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>结算号</th>
                <th>周期</th>
                <th>状态</th>
                <th>订单</th>
                <th>成交</th>
                <th>我的利润</th>
                <th>已打款</th>
                <th>生成时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="settlement in agentSettlements"
                :key="settlement.id"
              >
                <td>{{ settlement.settlementNo }}</td>
                <td>
                  {{ new Date(settlement.periodStart).toLocaleDateString() }}
                  -
                  {{ new Date(settlement.periodEnd).toLocaleDateString() }}
                </td>
                <td>{{ settlement.status }}</td>
                <td>{{ settlement.paidOrderCount }}</td>
                <td>￥{{ settlement.paidAmount }}</td>
                <td>￥{{ settlement.agentProfit }}</td>
                <td>￥{{ settlement.withdrawalAmount }}</td>
                <td>{{ new Date(settlement.createdAt).toLocaleString() }}</td>
                <td>
                  <button
                    class="table-button"
                    type="button"
                    @click="toggleAgentSettlementSnapshot(settlement.id)"
                  >
                    快照
                  </button>
                  <button
                    class="table-button"
                    type="button"
                    @click="loadAgentSettlementDetails(settlement.id)"
                  >
                    明细
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div
            v-if="expandedAgentSettlement"
            class="settlement-snapshot"
          >
            <div class="panel-heading subtle">
              <h3>结算快照：{{ expandedAgentSettlement.settlementNo }}</h3>
              <span>
                生成于
                {{ expandedAgentSettlement.snapshot?.generatedAt ? new Date(expandedAgentSettlement.snapshot.generatedAt).toLocaleString() : '-' }}
              </span>
            </div>
            <div class="metric-grid compact">
              <article class="metric-card">
                <span>快照订单数</span>
                <strong>{{ expandedAgentSettlement.snapshot?.orders?.paidCount ?? expandedAgentSettlement.paidOrderCount }}</strong>
              </article>
              <article class="metric-card">
                <span>快照成交</span>
                <strong>￥{{ expandedAgentSettlement.snapshot?.orders?.paidAmount ?? expandedAgentSettlement.paidAmount }}</strong>
              </article>
              <article class="metric-card">
                <span>快照我的利润</span>
                <strong>￥{{ expandedAgentSettlement.snapshot?.orders?.agentProfit ?? expandedAgentSettlement.agentProfit }}</strong>
              </article>
              <article class="metric-card">
                <span>快照已打款</span>
                <strong>￥{{ expandedAgentSettlement.snapshot?.withdrawals?.paidAmount ?? expandedAgentSettlement.withdrawalAmount }}</strong>
              </article>
            </div>
            <div v-if="agentSettlementDetails[expandedAgentSettlement.id]">
              <div class="panel-heading subtle">
                <h3>我的订单明细</h3>
                <span>{{ agentSettlementDetails[expandedAgentSettlement.id].orders.meta.total }} 笔订单</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>订单号</th>
                    <th>分站</th>
                    <th>商品</th>
                    <th>数量</th>
                    <th>成交</th>
                    <th>我的利润</th>
                    <th>支付时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="order in agentSettlementDetails[expandedAgentSettlement.id].orders.items"
                    :key="order.id"
                  >
                    <td>{{ order.orderNo }}</td>
                    <td>{{ order.siteName ?? '-' }}</td>
                    <td>{{ order.productName ?? '-' }}</td>
                    <td>{{ order.quantity }}</td>
                    <td>￥{{ order.totalAmount }}</td>
                    <td>￥{{ order.agentProfit }}</td>
                    <td>{{ order.paidAt ? new Date(order.paidAt).toLocaleString() : '-' }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="pagination-bar">
                <button
                  class="table-button"
                  type="button"
                  :disabled="agentSettlementDetails[expandedAgentSettlement.id].orders.meta.page <= 1"
                  @click="changeAgentSettlementDetailPage(expandedAgentSettlement.id, 'orders', -1)"
                >
                  上一页
                </button>
                <span>
                  第 {{ agentSettlementDetails[expandedAgentSettlement.id].orders.meta.page }} /
                  {{ agentSettlementDetails[expandedAgentSettlement.id].orders.meta.totalPages }} 页
                </span>
                <button
                  class="table-button"
                  type="button"
                  :disabled="agentSettlementDetails[expandedAgentSettlement.id].orders.meta.page >= agentSettlementDetails[expandedAgentSettlement.id].orders.meta.totalPages"
                  @click="changeAgentSettlementDetailPage(expandedAgentSettlement.id, 'orders', 1)"
                >
                  下一页
                </button>
              </div>
              <div class="panel-heading subtle">
                <h3>我的提现明细</h3>
                <span>{{ agentSettlementDetails[expandedAgentSettlement.id].withdrawals.meta.total }} 笔已打款</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>金额</th>
                    <th>账号</th>
                    <th>备注</th>
                    <th>打款时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="withdrawal in agentSettlementDetails[expandedAgentSettlement.id].withdrawals.items"
                    :key="withdrawal.id"
                  >
                    <td>￥{{ withdrawal.amount }}</td>
                    <td>{{ withdrawal.accountType }} / {{ withdrawal.accountName }} / {{ withdrawal.accountNo }}</td>
                    <td>{{ withdrawal.reviewRemark ?? '-' }}</td>
                    <td>{{ withdrawal.paidAt ? new Date(withdrawal.paidAt).toLocaleString() : '-' }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="pagination-bar">
                <button
                  class="table-button"
                  type="button"
                  :disabled="agentSettlementDetails[expandedAgentSettlement.id].withdrawals.meta.page <= 1"
                  @click="changeAgentSettlementDetailPage(expandedAgentSettlement.id, 'withdrawals', -1)"
                >
                  上一页
                </button>
                <span>
                  第 {{ agentSettlementDetails[expandedAgentSettlement.id].withdrawals.meta.page }} /
                  {{ agentSettlementDetails[expandedAgentSettlement.id].withdrawals.meta.totalPages }} 页
                </span>
                <button
                  class="table-button"
                  type="button"
                  :disabled="agentSettlementDetails[expandedAgentSettlement.id].withdrawals.meta.page >= agentSettlementDetails[expandedAgentSettlement.id].withdrawals.meta.totalPages"
                  @click="changeAgentSettlementDetailPage(expandedAgentSettlement.id, 'withdrawals', 1)"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
          <p
            v-if="agentSettlements.length === 0"
            class="empty-text"
          >
            暂无结算单。
          </p>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <h2>申请提现</h2>
            <span>提交后余额会先冻结，管理员审核后完成打款</span>
          </div>
          <form
            class="form-grid three"
            @submit.prevent="createWithdrawal"
          >
            <label>
              提现金额
              <input
                v-model.number="withdrawalForm.amount"
                type="number"
                min="0.01"
                step="0.01"
              >
            </label>
            <label>
              收款方式
              <select v-model="withdrawalForm.accountType">
                <option value="alipay">
                  支付宝
                </option>
                <option value="bank">
                  银行卡
                </option>
                <option value="wechat">
                  微信
                </option>
              </select>
            </label>
            <label>
              收款姓名
              <input v-model="withdrawalForm.accountName">
            </label>
            <label>
              收款账号
              <input v-model="withdrawalForm.accountNo">
            </label>
            <label>
              备注
              <input v-model="withdrawalForm.remark">
            </label>
            <button
              class="solid-button"
              type="submit"
            >
              提交提现
            </button>
          </form>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <h2>资金流水</h2>
            <span>{{ agentFinanceTransactions.length }} 条流水</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>类型</th>
                <th>金额</th>
                <th>余额</th>
                <th>关联号</th>
                <th>备注</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="transaction in agentFinanceTransactions"
                :key="transaction.id"
              >
                <td>{{ transaction.type }}</td>
                <td>￥{{ transaction.amount }}</td>
                <td>￥{{ transaction.balanceAfter }}</td>
                <td>{{ transaction.referenceNo }}</td>
                <td>{{ transaction.remark ?? '-' }}</td>
                <td>{{ new Date(transaction.createdAt).toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <h2>提现记录</h2>
            <span>{{ agentWithdrawals.length }} 条记录</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>金额</th>
                <th>账号</th>
                <th>状态</th>
                <th>备注</th>
                <th>申请时间</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="withdrawal in agentWithdrawals"
                :key="withdrawal.id"
              >
                <td>￥{{ withdrawal.amount }}</td>
                <td>{{ withdrawal.accountType }} / {{ withdrawal.accountName }} / {{ withdrawal.accountNo }}</td>
                <td>{{ withdrawal.status }}</td>
                <td>{{ withdrawal.reviewRemark ?? withdrawal.remark ?? '-' }}</td>
                <td>{{ new Date(withdrawal.createdAt).toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </section>
    </main>
  </div>
</template>
