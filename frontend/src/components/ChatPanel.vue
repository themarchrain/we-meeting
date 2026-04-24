<template>
  <div class="chat-panel">
    <!-- 消息列表区域 -->
    <div class="chat-messages" ref="messagesRef" @scroll="handleScroll">
      <!-- 加载更多提示 -->
      <div v-if="loading" class="loading-tip">
        <el-icon class="is-loading"><Loading /></el-icon>
        加载中...
      </div>
      <div v-else-if="hasMore" class="load-more-tip" @click="$emit('loadMore')">
        点击加载更多
      </div>
      <div v-else-if="messages.length > 0" class="no-more-tip">
        没有更多消息了
      </div>
      
      <div 
        v-for="(msg, index) in messages" 
        :key="msg.messageId || index" 
        class="chat-message"
        :class="{ 
          'is-self': msg.sendUserId === currentUserId,
          'is-private': msg.receiveType === 1
        }"
      >
        <div class="msg-sender" v-if="msg.sendUserId !== currentUserId">
          {{ msg.sendUserNickName }}
          <span v-if="msg.receiveType === 1" class="private-tag">私聊</span>
        </div>
        <div class="msg-bubble">
          {{ msg.content || msg.messageContent }}
        </div>
        <div class="msg-time">{{ formatTime(msg.sendTime) }}</div>
      </div>
      
      <div v-if="messages.length === 0 && !loading" class="empty-tip">
        暂无消息，开始聊天吧~
      </div>
    </div>
    
    <!-- 私聊目标选择（会议内私聊时显示） -->
    <div v-if="showPrivateSelect && members && members.length > 1" class="private-select">
      <el-select v-model="privateTarget" placeholder="发送给所有人" clearable size="small">
        <el-option label="所有人" value="" />
        <el-option 
          v-for="member in otherMembers" 
          :key="member.userId" 
          :label="member.nickName" 
          :value="member.userId" 
        />
      </el-select>
    </div>
    
    <!-- 输入区域 -->
    <div class="chat-input">
      <el-input 
        v-model="inputText" 
        placeholder="输入消息..." 
        @keyup.enter="handleSend"
        :maxlength="500"
      />
      <el-button type="primary" @click="handleSend" :disabled="!inputText.trim()">
        发送
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { Loading } from '@element-plus/icons-vue'

// 聊天消息接口
export interface ChatMessage {
  messageId?: number
  sendUserId: string
  sendUserNickName: string
  content?: string
  messageContent?: string
  sendTime: number
  receiveType?: number  // 0-群发, 1-私聊
  receiveUserId?: string
}

// 会议成员接口
export interface MeetingMember {
  userId: string
  nickName: string
}

const props = withDefaults(defineProps<{
  messages: ChatMessage[]
  currentUserId: string
  loading?: boolean
  hasMore?: boolean
  showPrivateSelect?: boolean
  members?: MeetingMember[]
}>(), {
  loading: false,
  hasMore: false,
  showPrivateSelect: false,
  members: () => []
})

const emit = defineEmits<{
  (e: 'send', content: string, receiveUserId?: string): void
  (e: 'loadMore'): void
}>()

const inputText = ref('')
const messagesRef = ref<HTMLElement | null>(null)
const privateTarget = ref('')

// 其他成员（排除自己）
const otherMembers = computed(() => {
  return props.members.filter(m => m.userId !== props.currentUserId)
})

// 格式化时间
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  
  const time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  
  if (isToday) {
    return time
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`
}

// 发送消息
function handleSend() {
  const content = inputText.value.trim()
  if (!content) return
  
  emit('send', content, privateTarget.value || undefined)
  inputText.value = ''
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

// 处理滚动事件（滚动到顶部时加载更多）
function handleScroll() {
  if (!messagesRef.value || props.loading || !props.hasMore) return
  
  if (messagesRef.value.scrollTop < 50) {
    emit('loadMore')
  }
}

// 监听消息变化，自动滚动到底部
watch(() => props.messages.length, (newLen, oldLen) => {
  // 只有新增消息时才滚动到底部（加载历史消息时不滚动）
  if (newLen > oldLen) {
    scrollToBottom()
  }
})

// 暴露方法给父组件
defineExpose({
  scrollToBottom
})
</script>

<style scoped>
/* 微信风格配色 */
.chat-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

/* 消息列表区域 - 微信灰色背景 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #EDEDED;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 加载提示 */
.loading-tip,
.load-more-tip,
.no-more-tip {
  text-align: center;
  font-size: 12px;
  color: #999999;
  padding: 8px;
}

.loading-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.load-more-tip {
  cursor: pointer;
  color: #07C160;
}

.load-more-tip:hover {
  text-decoration: underline;
}

/* 单条消息容器 */
.chat-message {
  max-width: 75%;
  display: flex;
  flex-direction: column;
}

/* 自己的消息靠右 */
.chat-message.is-self {
  align-self: flex-end;
  align-items: flex-end;
}

/* 他人的消息靠左 */
.chat-message:not(.is-self) {
  align-self: flex-start;
  align-items: flex-start;
}

/* 私聊消息样式 */
.chat-message.is-private .msg-bubble {
  border: 1px dashed #FF9800;
}

/* 发送者名称 - 灰色 */
.msg-sender {
  font-size: 12px;
  color: #999999;
  margin-bottom: 4px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.private-tag {
  font-size: 10px;
  color: #FF9800;
  background: rgba(255, 152, 0, 0.1);
  padding: 1px 4px;
  border-radius: 2px;
}

/* 消息气泡 */
.msg-bubble {
  padding: 10px 14px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  color: #000000;
  position: relative;
}

/* 自己的消息 - 微信绿色气泡 */
.chat-message.is-self .msg-bubble {
  background: #95EC69;
  border-radius: 4px 0 4px 4px;
}

/* 他人的消息 - 白色气泡 */
.chat-message:not(.is-self) .msg-bubble {
  background: #FFFFFF;
  border-radius: 0 4px 4px 4px;
}

/* 时间戳 - 灰色 */
.msg-time {
  font-size: 10px;
  color: #999999;
  margin-top: 4px;
  padding: 0 4px;
}

/* 空消息提示 */
.empty-tip {
  text-align: center;
  color: #999999;
  padding: 40px 20px;
  font-size: 14px;
}

/* 私聊目标选择 */
.private-select {
  padding: 8px 16px;
  background: #FFFFFF;
  border-top: 1px solid #E5E5E5;
}

.private-select .el-select {
  width: 100%;
}

/* 输入区域 - 白色背景 */
.chat-input {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #FFFFFF;
  border-top: 1px solid #E5E5E5;
}

.chat-input .el-input {
  flex: 1;
}

/* 输入框样式 */
.chat-input :deep(.el-input__wrapper) {
  background: #F5F5F5;
  border: none;
  box-shadow: none;
}

.chat-input :deep(.el-input__wrapper:hover),
.chat-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: none;
}

/* 发送按钮 */
.chat-input .el-button {
  background: #07C160;
  border-color: #07C160;
}

.chat-input .el-button:hover {
  background: #06AD56;
  border-color: #06AD56;
}

.chat-input .el-button:disabled {
  background: #A0CFFF;
  border-color: #A0CFFF;
}
</style>
