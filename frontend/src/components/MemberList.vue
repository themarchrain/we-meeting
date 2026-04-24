<template>
  <div class="member-list">
    <div v-for="member in members" :key="member.userId" class="member-item">
      <div class="member-avatar">{{ member.nickName.charAt(0) }}</div>
      <div class="member-detail">
        <span class="name">{{ member.nickName }}</span>
        <span v-if="member.memberType === MemberType.CREATOR" class="host-tag">主持人</span>
        <span v-if="member.userId === currentUserId" class="self-tag">我</span>
      </div>
      <div class="member-status">
        <el-icon v-if="member.videoOpen" class="status-on"><VideoCamera /></el-icon>
        <el-icon v-else class="status-off"><VideoCameraFilled /></el-icon>
      </div>
      <!-- 创建者可以踢出/拉黑其他成员 -->
      <div 
        v-if="isCreator && member.userId !== currentUserId && member.memberType !== MemberType.CREATOR" 
        class="member-actions"
      >
        <el-button 
          type="warning" 
          size="small" 
          text 
          @click.stop="handleKick(member.userId)"
        >
          踢出
        </el-button>
        <el-button 
          type="danger" 
          size="small" 
          text 
          @click.stop="handleBlacklist(member.userId)"
        >
          拉黑
        </el-button>
      </div>
    </div>
    
    <div v-if="members.length === 0" class="empty-tip">
      暂无成员
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VideoCamera, VideoCameraFilled } from '@element-plus/icons-vue'
import { MemberType } from '@/utils/websocket'
import type { MeetingMember } from '@/utils/websocket'

const props = defineProps<{
  members: MeetingMember[]
  currentUserId: string
  creatorId: string
}>()

const emit = defineEmits<{
  (e: 'kick', userId: string): void
  (e: 'blacklist', userId: string): void
}>()

// 当前用户是否是创建者
const isCreator = computed(() => props.currentUserId === props.creatorId)

function handleKick(userId: string) {
  emit('kick', userId)
}

function handleBlacklist(userId: string) {
  emit('blacklist', userId)
}
</script>

<style scoped>
.member-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #f5f7fa;
  transition: background 0.2s;
}

.member-item:hover {
  background: #ebeef5;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.member-detail {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.member-detail .name {
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.host-tag {
  font-size: 10px;
  padding: 2px 6px;
  background: #409eff;
  color: #fff;
  border-radius: 4px;
  flex-shrink: 0;
}

.self-tag {
  font-size: 10px;
  padding: 2px 6px;
  background: #67c23a;
  color: #fff;
  border-radius: 4px;
  flex-shrink: 0;
}

.member-status {
  flex-shrink: 0;
}

.member-status .status-on {
  color: #67c23a;
}

.member-status .status-off {
  color: #909399;
}

.member-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.empty-tip {
  text-align: center;
  color: #909399;
  padding: 20px;
}
</style>
