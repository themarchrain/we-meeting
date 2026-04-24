<template>
  <div v-if="meeting" class="current-meeting-card" @click="handleRejoin">
    <div class="card-header">
      <el-icon class="pulse-icon" :size="20"><VideoCamera /></el-icon>
      <span class="status-text">进行中的会议</span>
    </div>
    <div class="card-body">
      <div class="meeting-name">{{ meeting.meetingName }}</div>
      <div class="meeting-details">
        <span class="meeting-no">会议号: {{ meeting.meetingNo }}</span>
        <span class="meeting-duration">
          <el-icon><Clock /></el-icon>
          {{ formatDuration }}
        </span>
      </div>
    </div>
    <div class="card-footer">
      <el-button type="primary" size="small" round>
        <el-icon><VideoCamera /></el-icon>
        重新加入
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { VideoCamera, Clock } from '@element-plus/icons-vue'
import type { MeetingInfo } from '@/types'

const props = defineProps<{
  meeting: MeetingInfo | null
}>()

const emit = defineEmits<{
  (e: 'rejoin', meetingId: string): void
}>()

// 计算会议持续时间
const duration = ref(0)
let durationTimer: number | null = null

const formatDuration = computed(() => {
  const h = Math.floor(duration.value / 3600)
  const m = Math.floor((duration.value % 3600) / 60)
  const s = duration.value % 60
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

function calculateDuration() {
  if (props.meeting?.startTime) {
    const startTime = new Date(props.meeting.startTime).getTime()
    const now = Date.now()
    duration.value = Math.floor((now - startTime) / 1000)
  }
}

function handleRejoin() {
  if (props.meeting) {
    emit('rejoin', props.meeting.meetingId)
  }
}

onMounted(() => {
  calculateDuration()
  durationTimer = window.setInterval(() => {
    duration.value++
  }, 1000)
})

onUnmounted(() => {
  if (durationTimer) {
    clearInterval(durationTimer)
  }
})
</script>

<style scoped>
.current-meeting-card {
  max-width: 1240px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #0f766e 0%, #111827 100%);
  border-radius: var(--radius-md);
  padding: 20px;
  color: #fff;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.current-meeting-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(20, 184, 166, 0.24);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.pulse-icon {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 12px;
  opacity: 0.9;
}

.card-body {
  margin-bottom: 16px;
}

.meeting-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.meeting-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  opacity: 0.9;
}

.meeting-duration {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
}

.card-footer .el-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
}

.card-footer .el-button:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
