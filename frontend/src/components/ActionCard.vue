<template>
  <div class="action-card" @click="$emit('click')">
    <div class="card-icon">
      <slot name="icon">
        <component :is="icon" v-if="icon" />
      </slot>
    </div>
    <div class="card-copy">
      <span class="card-label">{{ label }}</span>
      <span v-if="description" class="card-description">{{ description }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  label: string
  icon?: Component
  description?: string
}>()

defineEmits<{
  click: []
}>()
</script>

<style scoped>
.action-card {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: var(--color-bg-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--transition-normal), background var(--transition-normal), box-shadow var(--transition-normal), transform var(--transition-fast);
  min-height: 128px;
}

.action-card:hover {
  border-color: var(--color-accent);
  background: rgba(20, 184, 166, 0.04);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.action-card:hover .card-icon {
  color: var(--color-accent);
  background: rgba(20, 184, 166, 0.12);
}

.card-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: var(--radius-md);
  background: var(--color-bg-light);
  color: var(--color-text-secondary);
  transition: color var(--transition-normal), background var(--transition-normal);
}

.card-icon :deep(svg) {
  width: 30px;
  height: 30px;
}

.card-copy {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  min-width: 0;
}

.card-label {
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--color-text-primary);
}

.card-description {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}
</style>
