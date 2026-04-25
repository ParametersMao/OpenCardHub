<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

type ViewKey =
  | 'overview'
  | 'levels'
  | 'users'
  | 'catalog'
  | 'inventory'
  | 'sites';

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
  salePrice: number;
  minSalePrice: number;
  defaultWholesalePrice: number;
  stockCount: number;
  status: string;
}

interface Site {
  id: string;
  name: string;
  ownerUserId: string;
  status: string;
  domains: Array<{
    domain: string;
    type: string;
    status: string;
    isPrimary: boolean;
  }>;
}

interface User {
  id: string;
  username: string;
  role: string;
  levelCode: string;
  status: string;
  balance: number;
  createdAt: string;
}

interface StockSnapshot {
  productId: string;
  counts: Record<string, number>;
}

const navItems: Array<{ key: ViewKey; label: string }> = [
  { key: 'overview', label: '总览' },
  { key: 'levels', label: '等级能力' },
  { key: 'users', label: '用户' },
  { key: 'catalog', label: '商品' },
  { key: 'inventory', label: '库存' },
  { key: 'sites', label: '分站' },
];

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
const users = ref<User[]>([]);
const stockSnapshots = ref<Record<string, StockSnapshot>>({});

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
      accessToken.value = '';
      currentUser.value = null;
      localStorage.removeItem('opencardhub_token');
    }
    throw new Error(await response.text());
  }

  return response.json() as Promise<T>;
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
    await loadAll();
  } catch (error) {
    message.value = error instanceof Error ? error.message : '登录失败';
  } finally {
    loading.value = false;
  }
}

function logout() {
  accessToken.value = '';
  currentUser.value = null;
  localStorage.removeItem('opencardhub_token');
}

async function loadAll() {
  if (!accessToken.value) {
    return;
  }

  loading.value = true;
  message.value = '';

  try {
    const [
      me,
      persistedLevels,
      keys,
      userList,
      categoryList,
      productList,
      siteList,
    ] =
      await Promise.all([
        request<User>('/api/auth/me'),
        request<Level[]>('/api/capabilities/levels/persisted'),
        request<string[]>('/api/capabilities/keys'),
        request<User[]>('/api/users'),
        request<Category[]>('/api/catalog/categories'),
        request<Product[]>('/api/catalog/products'),
        request<Site[]>('/api/sites'),
      ]);

    currentUser.value = me;
    levels.value = persistedLevels;
    capabilityKeys.value = keys;
    users.value = userList;
    categories.value = categoryList;
    products.value = productList;
    sites.value = siteList;
  } catch (error) {
    message.value =
      error instanceof Error ? error.message : '加载管理数据失败';
  } finally {
    loading.value = false;
  }
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
    message.value =
      error instanceof Error ? error.message : '初始化等级能力失败';
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
  await request(`/api/users/${user.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
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
  };
  await loadAll();
}

async function updateSiteStatus(
  site: Site,
  status: 'active' | 'suspended' | 'banned',
) {
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
    message.value = '请填写代理用户 ID 和分站名称';
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
          <small>Admin Console</small>
        </div>
      </div>
      <h1>管理员登录</h1>
      <p class="login-copy">
        使用总后台账号进入配置中心、商品、库存和分站管理。
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
          <small>Admin Console</small>
        </div>
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
          <h1>{{ navItems.find((item) => item.key === activeView)?.label }}</h1>
        </div>
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
            <p>已完成：等级能力、配置中心、商品、卡密库存、订单、支付骨架、分站解析、分站商品覆盖。</p>
            <p>下一步：把这些后台操作逐步补成完整的可配置表单和权限控制。</p>
          </div>
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
                <td>{{ user.balance }}</td>
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
              代理用户 ID
              <select v-model="siteForm.ownerUserId">
                <option value="">
                  请选择
                </option>
                <option
                  v-for="user in users"
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
    </main>
  </div>
</template>
