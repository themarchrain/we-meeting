<template>
  <div class="meeting-card">
    <div class="meeting-name">{{ meeting.meetingName }}</div>
    <div class="meeting-info">
      <span class="meeting-no">会议号: {{ meeting.meetingNo }}</span>
      <span class="create-time">{{ formatTime(meeting.createTime) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MeetingInfo } from '@/types'

defineProps<{
  meeting: MeetingInfo
}>()

function formatTime(time: string): string {
  if (!time) return ''
  return time.replace('T', ' ').substring(0, 16)
}
</script>

<style scoped>
.meeting-card {
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: box-shadow 0.3s;
}
.meeting-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
.meeting-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}
.meeting-info {
  display: flex;
  justify-content: space-between;
  color: #909399;
  font-size: 13px;
}
</style>
