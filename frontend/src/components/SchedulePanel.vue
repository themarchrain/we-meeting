<template>
  <div class="schedule-panel">
    <!-- Date Header -->
    <div class="schedule-header">
      <div class="date-display">
        <span class="date-day">{{ currentDay }}</span>
        <div class="date-meta">
          <span class="date-month">{{ currentMonth }}</span>
          <span class="date-weekday">{{ currentWeekday }}</span>
        </div>
      </div>
      <span class="header-title">今日会议</span>
    </div>
    
    <!-- Meeting List -->
    <div class="schedule-content">
      <div v-if="loading" class="schedule-loading">
        <div class="skeleton-card" v-for="i in 2" :key="i"></div>
      </div>
      
      <div v-else-if="meetings.length === 0" class="schedule-empty">
        <el-icon :size="32"><Calendar /></el-icon>
        <span>今日暂无会议</span>
      </div>
      
      <div v-else class="meeting-cards">
        <div 
          v-for="meeting in displayMeetings" 
          :key="meeting.id"
          class="meeting-card"
          :class="meeting.status"
          @click="$emit('meeting-click', meeting)"
        >
          <div class="card-status">
            <span class="status-dot" :class="meeting.status"></span>
            <span class="status-text">{{ getStatusText(meeting.status) }}</span>
          </div>
          <div class="card-name">{{ meeting.name }}</div>
          <div class="card-info">
            <el-icon><Clock /></el-icon>
            <span>{{ formatTime(meeting.startTime) }}</span>
            <span class="duration">{{ meeting.duration }}分钟</span>
          </div>
          <div class="card-action" v-if="meeting.status === 'ongoing' || meeting.status === 'upcoming'">
            <el-button 
              size="small" 
              :type="meeting.status === 'ongoing' ? 'primary' : 'default'"
              @click.stop="$emit('meeting-click', meeting)"
            >
              {{ meeting.status === 'ongoing' ? '加入会议' : '查看详情' }}
            </el-button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="schedule-footer">
      <a class="view-all" @click="$emit('view-all')">
        查看全部会议
        <span class="arrow">→</span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Calendar, Clock } from '@element-plus/icons-vue'

export interface ScheduleMeeting {
  id: string
  name: string
  meetingNo: string
  startTime: string
  duration: number
  status?: 'ongoing' | 'upcoming' | 'ended'
  realMeetingId?: string
}

const props = withDefaults(defineProps<{
  meetings?: ScheduleMeeting[]
  loading?: boolean
  maxDisplay?: number
}>(), {
  meetings: () => [],
  loading: false,
  maxDisplay: 5
})

defineEmits<{
  'meeting-click': [meeting: ScheduleMeeting]
  'view-all': []
}>()

const now = new Date()

const currentDay = computed(() => now.getDate().toString())
const currentMonth = computed(() => `${now.getMonth() + 1}月`)
const currentWeekday = computed(() => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekdays[now.getDay()]
})

const displayMeetings = computed(() => {
  return props.meetings.slice(0, props.maxDisplay)
})

function getStatusText(status?: string) {
  switch (status) {
    case 'ongoing': return '进行中'
    case 'upcoming': return '待开始'
    case 'ended': return '已结束'
    default: return '待开始'
  }
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}
</script>

<style scoped>
.schedule-panel {
  background: var(--color-bg-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 300px;
}

.schedule-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.date-display {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-sm);
}

.date-day {
  font-size: var(--font-size-3xl);
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1;
}

.date-meta {
  display: flex;
  flex-direction: column;
}

.date-month {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.date-weekday {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.header-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-weight: 500;
}

.schedule-content {
  flex: 1;
  padding: var(--spacing-md);
  overflow-y: auto;
}

.schedule-loading {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.skeleton-card {
  height: 100px;
  background: linear-gradient(90deg, var(--color-bg-light) 25%, var(--color-border-light) 50%, var(--color-bg-light) 75%);
  background-size: 200% 100%;
  border-radius: var(--radius-md);
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.schedule-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 150px;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  gap: var(--spacing-sm);
}

.schedule-empty .el-icon {
  color: var(--color-border);
}

.meeting-cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.meeting-card {
  background: var(--color-bg-light);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.meeting-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.meeting-card.ongoing {
  border-left: 3px solid var(--color-accent);
  background: rgba(20, 184, 166, 0.06);
}

.meeting-card.upcoming {
  border-left: 3px solid var(--color-primary);
}

.meeting-card.ended {
  border-left: 3px solid var(--color-text-muted);
  opacity: 0.7;
}

.card-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: var(--spacing-xs);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot.ongoing {
  background: var(--color-accent);
  animation: pulse 2s infinite;
}

.status-dot.upcoming {
  background: var(--color-primary);
}

.status-dot.ended {
  background: var(--color-text-muted);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.card-name {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.card-info .el-icon {
  font-size: 12px;
}

.duration {
  margin-left: var(--spacing-xs);
  padding-left: var(--spacing-xs);
  border-left: 1px solid var(--color-border-light);
}

.card-action {
  margin-top: var(--spacing-sm);
  display: flex;
  justify-content: flex-end;
}

.card-action .el-button--primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.schedule-footer {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--color-border-light);
}

.view-all {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--color-accent);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.view-all:hover {
  color: var(--color-primary);
}

.arrow {
  transition: transform var(--transition-fast);
}

.view-all:hover .arrow {
  transform: translateX(4px);
}
</style>
