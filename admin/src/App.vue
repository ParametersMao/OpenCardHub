<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

type ViewKey = 'overview' | 'levels' | 'catalog' | 'sites';

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

const navItems: Array<{ key: ViewKey; label: string }> = [
  { key: 'overview', label: '总览' },
  { key: 'levels', label: '等级能力' },
  { key: 'catalog', label: '商品' },
  { key: 'sites', label: '分站' },
];

const activeView = ref<ViewKey>('overview');
const loading = ref(false);
const message = ref('');
const levels = ref<Level[]>([]);
const categories = ref<Category[]>([]);
const products = ref<Product[]>([]);
const sites = ref<Site[]>([]);

const categoryForm = ref({ name: '' });
const productForm = ref({
  categoryId: '',
  name: '',
  costPrice: 0,
  defaultWholesalePrice: 0,
  salePrice: 0,
  minSalePrice: 0,
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
  {
    label: '可售库存',
    value: products.value.reduce((sum, product) => sum + product.stockCount, 0),
  },
]);

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<T>;
}

async function loadAll() {
  loading.value = true;
  message.value = '';

  try {
    const [persistedLevels, categoryList, productList, siteList] =
      await Promise.all([
        request<Level[]>('/api/capabilities/levels/persisted'),
        request<Category[]>('/api/catalog/categories'),
        request<Product[]>('/api/catalog/products'),
        request<Site[]>('/api/sites'),
      ]);

    levels.value = persistedLevels;
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
  void loadAll();
});
</script>

<template>
  <div class="app-shell">
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
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="product in products"
                :key="product.id"
              >
                <td>{{ product.name }}</td>
                <td>{{ product.category?.name ?? '-' }}</td>
                <td>{{ product.salePrice }}</td>
                <td>{{ product.defaultWholesalePrice }}</td>
                <td>{{ product.stockCount }}</td>
                <td>{{ product.status }}</td>
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
              <input v-model="siteForm.ownerUserId">
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
              </tr>
            </tbody>
          </table>
        </section>
      </section>
    </main>
  </div>
</template>
