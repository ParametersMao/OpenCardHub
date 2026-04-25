<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

interface StorefrontProduct {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  price: number;
  platformPrice: number;
  stockCount: number;
}

interface Storefront {
  host: string;
  site: {
    id: string;
    name: string;
    logo?: string;
    notice?: string;
    seoTitle?: string;
    seoDescription?: string;
  };
  products: StorefrontProduct[];
}

interface PublicOrder {
  id: string;
  orderNo: string;
  productName?: string;
  quantity: number;
  totalAmount: number;
  paymentStatus: string;
  deliveryStatus: string;
  orderStatus: string;
  cards?: Array<{
    id: string;
    content: string;
  }>;
}

const params = new URLSearchParams(location.search);
const host = ref(params.get('host') ?? location.host);
const storefront = ref<Storefront | null>(null);
const loading = ref(false);
const message = ref('');
const buyerContact = ref('');
const selectedProductId = ref('');
const quantity = ref(1);
const latestOrder = ref<PublicOrder | null>(null);
const queryForm = ref({
  orderNo: '',
  buyerContact: '',
});

const selectedProduct = computed(() =>
  storefront.value?.products.find(
    (product) => product.id === selectedProductId.value,
  ),
);

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

async function loadStorefront() {
  loading.value = true;
  message.value = '';

  try {
    storefront.value = await request<Storefront>(
      `/api/storefront?host=${encodeURIComponent(host.value)}`,
    );
    selectedProductId.value = storefront.value.products[0]?.id ?? '';
  } catch (error) {
    storefront.value = null;
    message.value = error instanceof Error ? error.message : '分站加载失败';
  } finally {
    loading.value = false;
  }
}

async function createOrder() {
  if (!selectedProduct.value) {
    message.value = '请选择商品';
    return;
  }

  if (!buyerContact.value.trim()) {
    message.value = '请填写联系方式';
    return;
  }

  loading.value = true;
  message.value = '';

  try {
    const order = await request<PublicOrder>(
      `/api/storefront/orders?host=${encodeURIComponent(host.value)}`,
      {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProduct.value.id,
          quantity: quantity.value,
          buyerContact: buyerContact.value,
        }),
      },
    );
    latestOrder.value = order;
    queryForm.value = {
      orderNo: order.orderNo,
      buyerContact: buyerContact.value,
    };
    message.value = `订单 ${order.orderNo} 已创建，等待支付。`;
    await loadStorefront();
  } catch (error) {
    message.value = error instanceof Error ? error.message : '下单失败';
  } finally {
    loading.value = false;
  }
}

async function queryOrder() {
  if (!queryForm.value.orderNo.trim()) {
    message.value = '请填写订单号';
    return;
  }

  latestOrder.value = await request<PublicOrder>('/api/storefront/orders/query', {
    method: 'POST',
    body: JSON.stringify({
      orderNo: queryForm.value.orderNo,
      buyerContact: queryForm.value.buyerContact || undefined,
    }),
  });
}

async function mockPayOrder() {
  if (!latestOrder.value) {
    message.value = '请先创建或查询订单';
    return;
  }

  latestOrder.value = await request<PublicOrder>(
    '/api/storefront/orders/mock-pay',
    {
      method: 'POST',
      body: JSON.stringify({
        orderNo: latestOrder.value.orderNo,
      }),
    },
  );
  message.value = '模拟支付成功，卡密已发放。';
}

onMounted(() => {
  void loadStorefront();
});
</script>

<template>
  <main class="store-shell">
    <section class="hero-band">
      <div>
        <p class="eyebrow">
          OpenCardHub Storefront
        </p>
        <h1>{{ storefront?.site.name ?? '分站商城' }}</h1>
        <p>
          {{ storefront?.site.notice ?? '选择商品，填写联系方式，即可创建订单。' }}
        </p>
      </div>

      <form
        class="host-form"
        @submit.prevent="loadStorefront"
      >
        <label>
          当前访问域名
          <input v-model="host">
        </label>
        <button type="submit">
          加载分站
        </button>
      </form>
    </section>

    <p
      v-if="message"
      class="message"
    >
      {{ message }}
    </p>

    <section
      v-if="storefront"
      class="commerce-grid"
    >
      <div class="product-grid">
        <article
          v-for="product in storefront.products"
          :key="product.id"
          :class="{ selected: product.id === selectedProductId }"
          class="product-card"
          @click="selectedProductId = product.id"
        >
          <div class="product-art">
            {{ product.name.slice(0, 1) }}
          </div>
          <div>
            <h2>{{ product.name }}</h2>
            <p>{{ product.description ?? '虚拟商品自动发货' }}</p>
          </div>
          <footer>
            <strong>￥{{ product.price }}</strong>
            <span>库存 {{ product.stockCount }}</span>
          </footer>
        </article>
      </div>

      <aside class="checkout-panel">
        <h2>创建订单</h2>
        <p v-if="selectedProduct">
          {{ selectedProduct.name }} / ￥{{ selectedProduct.price }}
        </p>
        <form @submit.prevent="createOrder">
          <label>
            联系方式
            <input
              v-model="buyerContact"
              placeholder="邮箱 / 手机 / QQ"
            >
          </label>
          <label>
            数量
            <input
              v-model.number="quantity"
              type="number"
              min="1"
            >
          </label>
          <button
            :disabled="loading"
            type="submit"
          >
            {{ loading ? '处理中' : '提交订单' }}
          </button>
        </form>

        <div class="order-query">
          <h2>查询订单</h2>
          <form @submit.prevent="queryOrder">
            <label>
              订单号
              <input v-model="queryForm.orderNo">
            </label>
            <label>
              联系方式
              <input v-model="queryForm.buyerContact">
            </label>
            <button type="submit">
              查询订单
            </button>
          </form>
        </div>

        <section
          v-if="latestOrder"
          class="order-result"
        >
          <h2>订单结果</h2>
          <dl>
            <div>
              <dt>订单号</dt>
              <dd>{{ latestOrder.orderNo }}</dd>
            </div>
            <div>
              <dt>商品</dt>
              <dd>{{ latestOrder.productName }}</dd>
            </div>
            <div>
              <dt>金额</dt>
              <dd>￥{{ latestOrder.totalAmount }}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>{{ latestOrder.paymentStatus }} / {{ latestOrder.deliveryStatus }}</dd>
            </div>
          </dl>
          <button
            v-if="latestOrder.paymentStatus !== 'paid'"
            type="button"
            @click="mockPayOrder"
          >
            模拟支付并发货
          </button>
          <div
            v-if="latestOrder.cards?.length"
            class="card-list"
          >
            <strong>已发卡密</strong>
            <code
              v-for="card in latestOrder.cards"
              :key="card.id"
            >
              {{ card.content }}
            </code>
          </div>
        </section>
      </aside>
    </section>
  </main>
</template>
