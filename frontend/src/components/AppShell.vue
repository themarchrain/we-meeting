<template>
  <div class="app-shell">
    <SideNavigation />
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import SideNavigation from './SideNavigation.vue'
</script>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  min-width: var(--min-width);
  background: var(--color-bg-white);
}

.app-main {
  flex: 1;
  margin-left: var(--sidebar-width);
  min-height: 100vh;
}
</style>
