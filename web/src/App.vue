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

const params = new URLSearchParams(location.search);
const host = ref(params.get('host') ?? location.host);
const storefront = ref<Storefront | null>(null);
const loading = ref(false);
const message = ref('');
const buyerContact = ref('');
const selectedProductId = ref('');
const quantity = ref(1);

const selectedProduct = computed(() =>
  storefront.value?.products.find((product) => product.id === selectedProductId.value),
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
    message.value =
      error instanceof Error ? error.message : '分站加载失败';
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
    const order = await request<{
      orderNo: string;
      totalAmount: number;
      lockedCardIds: string[];
    }>(`/api/storefront/orders?host=${encodeURIComponent(host.value)}`, {
      method: 'POST',
      body: JSON.stringify({
        productId: selectedProduct.value.id,
        quantity: quantity.value,
        buyerContact: buyerContact.value,
      }),
    });
    message.value = `订单 ${order.orderNo} 已创建，金额 ${order.totalAmount}，等待支付。`;
    await loadStorefront();
  } catch (error) {
    message.value =
      error instanceof Error ? error.message : '下单失败';
  } finally {
    loading.value = false;
  }
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
      </aside>
    </section>
  </main>
</template>
