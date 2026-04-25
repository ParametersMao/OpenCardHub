<script setup lang="ts">
const levelCards = [
  {
    code: 'V0',
    title: '普通用户',
    description: '只购买商品与查询订单，不享受进货折扣，不开通分站。',
  },
  {
    code: 'V1',
    title: '一级代理',
    description: '享受主站管理员配置的进货折扣价，其余特权由能力项控制。',
  },
  {
    code: 'V2',
    title: '二级代理',
    description: '高级代理模板，默认拥有更多特权，但仍全部可由管理员配置。',
  },
];

const capabilities = [
  'purchase.goods',
  'agent.discount',
  'site.create',
  'domain.system_sub',
  'domain.custom',
  'product.custom_price',
  'template.premium',
  'pricing.advanced',
  'api.access',
];
</script>

<template>
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">
        OpenCardHub Admin
      </p>
      <h1>可配置的虚拟商品分销中台</h1>
      <p class="summary">
        先把 V0 / V1 / V2 等级、能力开关、进货价规则和分站特权做成配置中心，后续所有商业版能力都能从这里生长出来。
      </p>
    </section>

    <section class="panel">
      <div class="section-heading">
        <h2>等级模板</h2>
        <span>管理员最终配置生效能力</span>
      </div>

      <div class="level-grid">
        <article
          v-for="level in levelCards"
          :key="level.code"
          class="level-card"
        >
          <strong>{{ level.code }}</strong>
          <h3>{{ level.title }}</h3>
          <p>{{ level.description }}</p>
        </article>
      </div>
    </section>

    <section class="panel">
      <div class="section-heading">
        <h2>能力项</h2>
        <span>后端已预置首批 capability keys</span>
      </div>

      <div class="capability-grid">
        <code
          v-for="capability in capabilities"
          :key="capability"
        >{{ capability }}</code>
      </div>
    </section>
  </main>
</template>
