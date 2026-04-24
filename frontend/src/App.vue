<template>
  <router-view v-slot="{ Component }">
    <keep-alive :include="['History', 'Schedule']">
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { wsService, MessageType } from '@/utils/websocket'
import type { WebSocketMessage } from '@/utils/websocket'
import { acceptInvite, joinMeeting, getCurrentMeeting } from '@/api/meeting'
import type { MeetingInviteContent } from '@/types'

const router = useRouter()
const userStore = useUserStore()
const chatStore = useChatStore()

// 处理会议邀请消息
async function handleMeetingInvite(message: any) {
  const content = message.messageContent as MeetingInviteContent
  if (!content) return
  
  try {
    await ElMessageBox.confirm(
      `${content.inviteUserName} 邀请您加入会议「${content.meetingName}」`,
      '会议邀请',
      {
        confirmButtonText: '接受邀请',
        cancelButtonText: '稍后再说',
        type: 'info',
        distinguishCancelAndClose: true
      }
    )
    
    // 接受邀请
    await handleAcceptInvite(content.meetingId)
  } catch (action) {
    if (action === 'cancel') {
      ElMessage.info('您可以稍后在消息中查看邀请')
    }
  }
}

// 处理私聊消息（全局监听，用于更新未读计数）
function handlePrivateChatMessage(message: WebSocketMessage) {
  // 只处理私聊消息（messageSendToType === 0 表示发送给个人）
  if (message.messageSendToType !== 0) {
    return
  }
  
  // 只处理其他人发送给我的消息
  if (message.sendUserId === userStore.userId) {
    return
  }
  
  console.log('App.vue: 收到私聊消息，更新未读计数', message.sendUserId)
  
  // 增加发送者的未读消息计数
  if (message.sendUserId) {
    chatStore.incrementUnread(message.sendUserId)
  }
}

// 接受会议邀请
async function handleAcceptInvite(meetingId: string) {
  try {
    // 检查是否有正在进行的会议
    const currentMeeting = await getCurrentMeeting()
    if (currentMeeting && currentMeeting.meetingId !== meetingId) {
      await ElMessageBox.confirm(
        '您有正在进行的会议，接受邀请将离开当前会议。确定要继续吗？',
        '提示',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    }
    
    // 调用接受邀请接口
    const returnedMeetingId = await acceptInvite(meetingId)
    
    // 调用 joinMeeting 正式加入会议
    await joinMeeting({ videoOpen: true })
    
    ElMessage.success('已接受邀请，正在加入会议...')
    router.push(`/meeting/${returnedMeetingId}`)
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('接受邀请失败:', error)
      ElMessage.error('接受邀请失败，邀请可能已过期')
    }
  }
}

// 防止重复初始化的标志
let isInitializing = false

// 初始化全局 WebSocket 连接
async function initGlobalWebSocket() {
  if (!userStore.token) return
  
  // 如果已经连接或正在连接，直接返回
  if (wsService.isConnected || isInitializing) {
    console.log('WebSocket 已连接或正在连接，跳过初始化')
    return
  }
  
  isInitializing = true
  
  try {
    // 先验证 token 是否有效（调用任意需要认证的接口）
    // 如果 token 无效，这里会抛出 401 错误
    await getCurrentMeeting()
    
    // token 有效，建立 WebSocket 连接
    await wsService.connect()
    // 监听会议邀请消息（全局）
    wsService.on(MessageType.INVITE_MESSAGE_MEETING, handleMeetingInvite)
    // 监听私聊消息（全局，用于更新未读计数）
    wsService.on(MessageType.CHAT_TEXT_MESSAGE, handlePrivateChatMessage)
    wsService.on(MessageType.CHAT_MEDIA_MESSAGE, handlePrivateChatMessage)
    
    // 加载未读消息计数
    await chatStore.loadUnreadCounts()
    
    console.log('全局 WebSocket 连接已建立')
  } catch (error: any) {
    // token 无效或网络错误
    if (error.response?.status === 401 || error.message?.includes('401')) {
      console.warn('Token 已过期，需要重新登录')
      userStore.logout()
    } else {
      console.error('全局 WebSocket 连接失败:', error)
    }
  } finally {
    isInitializing = false
  }
}

// 监听用户登录状态变化
watch(() => userStore.token, (newToken, oldToken) => {
  if (newToken && !oldToken) {
    // 用户登录，建立 WebSocket 连接
    initGlobalWebSocket()
  } else if (!newToken && oldToken) {
    // 用户登出，断开 WebSocket 连接
    wsService.off(MessageType.INVITE_MESSAGE_MEETING, handleMeetingInvite)
    wsService.off(MessageType.CHAT_TEXT_MESSAGE, handlePrivateChatMessage)
    wsService.off(MessageType.CHAT_MEDIA_MESSAGE, handlePrivateChatMessage)
    wsService.disconnect()
    // 重置未读消息计数
    chatStore.resetAll()
    console.log('全局 WebSocket 连接已断开')
  }
})

onMounted(() => {
  userStore.restoreFromStorage()
  // 如果用户已登录，验证 token 并建立 WebSocket 连接
  if (userStore.token) {
    initGlobalWebSocket()
  }
})

onUnmounted(() => {
  wsService.off(MessageType.INVITE_MESSAGE_MEETING, handleMeetingInvite)
  wsService.off(MessageType.CHAT_TEXT_MESSAGE, handlePrivateChatMessage)
  wsService.off(MessageType.CHAT_MEDIA_MESSAGE, handlePrivateChatMessage)
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
