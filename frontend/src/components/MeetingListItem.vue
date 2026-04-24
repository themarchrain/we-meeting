<template>
  <div class="meeting-item" @click="$emit('click')">
    <div class="meeting-time">
      <span class="time-start">{{ startTime }}</span>
      <span class="time-separator">-</span>
      <span class="time-end">{{ endTime }}</span>
    </div>
    <div class="meeting-info">
      <div class="meeting-name">{{ name }}</div>
      <div class="meeting-no">会议号: {{ meetingNo }}</div>
    </div>
    <div class="meeting-status" v-if="status">
      <span class="status-badge" :class="status">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  meetingNo: string
  startTime: string
  endTime: string
  status?: 'ongoing' | 'upcoming' | 'ended'
}>()

defineEmits<{
  click: []
}>()

const statusText = computed(() => {
  switch (props.status) {
    case 'ongoing': return '进行中'
    case 'upcoming': return '即将开始'
    case 'ended': return '已结束'
    default: return ''
  }
})
</script>

<style scoped>
.meeting-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.meeting-item:hover {
  background: var(--color-bg-light);
}

.meeting-time {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.time-separator {
  color: var(--color-text-muted);
}

.meeting-info {
  flex: 1;
  min-width: 0;
}

.meeting-name {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meeting-no {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-top: 2px;
}

.status-badge {
  font-size: var(--font-size-xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.status-badge.ongoing {
  background: rgba(212, 175, 55, 0.15);
  color: var(--color-accent);
}

.status-badge.upcoming {
  background: rgba(64, 64, 64, 0.1);
  color: var(--color-text-secondary);
}

.status-badge.ended {
  background: var(--color-bg-light);
  color: var(--color-text-muted);
}
</style>
