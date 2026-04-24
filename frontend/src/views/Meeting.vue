<template>
  <div class="meeting-container">
    <!-- 顶部工具栏 -->
    <div class="meeting-header">
      <div class="header-left">
        <el-button type="text" class="back-btn" @click="handleBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <div class="meeting-info">
          <span class="meeting-name">{{ meetingName }}</span>
          <span class="meeting-id">会议号: {{ meetingNo }}</span>
        </div>
      </div>
      <div class="meeting-time">
        <el-icon><Clock /></el-icon>
        <span>{{ formatDuration(duration) }}</span>
      </div>
    </div>

    <!-- 视频区域 -->
    <div class="video-area">
      <div class="video-grid" :class="gridClass">
        <div 
          v-for="member in members" 
          :key="member.userId" 
          class="video-item"
          :class="{ 'is-self': member.userId === userStore.userId }"
        >
          <video 
            v-if="member.videoOpen && hasVideoStream(member.userId)"
            :ref="el => setVideoRef(member.userId, el)"
            autoplay
            playsinline
            :muted="member.userId === userStore.userId"
          ></video>
          <div v-else class="video-placeholder">
            <div class="avatar">{{ member.nickName.charAt(0) }}</div>
          </div>
          <div class="member-info">
            <span class="member-name">{{ member.nickName }}</span>
            <el-icon v-if="!member.videoOpen" class="video-off"><VideoCameraFilled /></el-icon>
          </div>
          <!-- 连接状态指示器 -->
          <div 
            v-if="member.userId !== userStore.userId && connectionStates[member.userId] && connectionStates[member.userId] !== 'connected'" 
            class="connection-state"
            :class="connectionStates[member.userId]"
          >
            {{ connectionStates[member.userId] }}
          </div>
        </div>
      </div>
    </div>

    <!-- 底部控制栏 -->
    <div class="meeting-controls">
      <div class="control-item" @click="toggleVideo">
        <el-icon :size="24" :class="{ 'is-off': !localVideoOpen }">
          <VideoCamera v-if="localVideoOpen" />
          <VideoCameraFilled v-else />
        </el-icon>
        <span>{{ localVideoOpen ? '关闭视频' : '开启视频' }}</span>
      </div>
      <div class="control-item" @click="toggleAudio">
        <el-icon :size="24" :class="{ 'is-off': !localAudioOpen }">
          <Microphone v-if="localAudioOpen" />
          <Mute v-else />
        </el-icon>
        <span>{{ localAudioOpen ? '静音' : '取消静音' }}</span>
      </div>
      <div class="control-item" @click="showMembers = !showMembers">
        <el-icon :size="24"><User /></el-icon>
        <span>成员 ({{ members.length }})</span>
      </div>
      <div class="control-item" @click="showInvite = true">
        <el-icon :size="24"><Plus /></el-icon>
        <span>邀请</span>
      </div>
      <div class="control-item" @click="showChat = !showChat">
        <el-icon :size="24"><ChatDotRound /></el-icon>
        <span>聊天</span>
      </div>
      <div v-if="isCreator" class="control-item end-meeting" @click="handleEndMeeting">
        <el-icon :size="24"><CircleClose /></el-icon>
        <span>结束会议</span>
      </div>
      <div class="control-item leave" @click="handleLeaveMeeting">
        <el-icon :size="24"><SwitchButton /></el-icon>
        <span>离开会议</span>
      </div>
    </div>

    <!-- 成员列表侧边栏 -->
    <el-drawer v-model="showMembers" title="会议成员" direction="rtl" size="320px">
      <MemberList 
        :members="members"
        :current-user-id="userStore.userId"
        :creator-id="creatorId"
        @kick="handleKickMember"
        @blacklist="handleBlacklistMember"
      />
    </el-drawer>

    <!-- 聊天侧边栏 -->
    <el-drawer v-model="showChat" title="会议聊天" direction="rtl" size="380px" @open="loadChatHistory">
      <ChatPanel 
        :messages="chatMessages"
        :current-user-id="userStore.userId"
        :loading="chatLoading"
        :has-more="chatHasMore"
        :show-private-select="true"
        :members="members"
        @send="sendChatMessage"
        @load-more="loadMoreChatHistory"
      />
    </el-drawer>

    <!-- 邀请联系人对话框 -->
    <el-dialog v-model="showInvite" title="邀请联系人" width="450px" :close-on-click-modal="false">
      <div class="invite-dialog">
        <el-input 
          v-model="inviteSearchKeyword" 
          placeholder="搜索联系人" 
          clearable
          class="invite-search"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <div class="contact-list" v-loading="contactsLoading">
          <div 
            v-for="contact in filteredContacts" 
            :key="contact.contactId"
            class="contact-item"
            :class="{ 'is-selected': selectedContacts.includes(contact.contactId) }"
            @click="toggleContactSelection(contact.contactId)"
          >
            <div class="contact-avatar">{{ contact.contactNickName.charAt(0) }}</div>
            <div class="contact-info">
              <span class="contact-name">{{ contact.contactNickName }}</span>
              <span class="contact-status" :class="{ 'is-online': contact.online }">
                {{ contact.online ? '在线' : '离线' }}
              </span>
            </div>
            <el-icon v-if="selectedContacts.includes(contact.contactId)" class="check-icon">
              <Check />
            </el-icon>
          </div>
          <el-empty v-if="filteredContacts.length === 0 && !contactsLoading" description="暂无联系人" />
        </div>
      </div>
      <template #footer>
        <span class="selected-count" v-if="selectedContacts.length > 0">
          已选择 {{ selectedContacts.length }} 人
        </span>
        <el-button @click="showInvite = false">取消</el-button>
        <el-button 
          type="primary" 
          :loading="inviteLoading" 
          :disabled="selectedContacts.length === 0"
          @click="confirmInvite"
        >
          发送邀请
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>


<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Clock, VideoCamera, VideoCameraFilled, Microphone, Mute,
  User, ChatDotRound, SwitchButton, ArrowLeft, CircleClose, Plus, Search, Check 
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { wsService, MessageType, MessageSendToType, MemberType, MemberStatus } from '@/utils/websocket'
import type { WebSocketMessage, MeetingMember, MeetingJoinContent, MeetingExitContent } from '@/utils/websocket'
import { webRTCManager } from '@/utils/webrtc'
import { kickOutMember, blacklistMember, finishMeeting, getCurrentMeeting, exitMeeting, inviteContactToMeeting } from '@/api/meeting'
import { loadContactUser } from '@/api/contact'
import { loadMeetingMessages, loadMoreMeetingMessages, sendMeetingMessage } from '@/api/chat'
import type { ChatMessage as ApiChatMessage } from '@/api/chat'
import MemberList from '@/components/MemberList.vue'
import ChatPanel from '@/components/ChatPanel.vue'
import type { ChatMessage } from '@/components/ChatPanel.vue'
import type { UserContactVo } from '@/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 会议信息
const meetingId = ref(route.params.meetingId as string || '')
const meetingNo = ref('')
const meetingName = ref('视频会议')
const creatorId = ref('')
const duration = ref(0)
let durationTimer: number | null = null

// 成员列表
const members = ref<MeetingMember[]>([])

// 视频流 - 使用 reactive 确保深层响应式
const videoStreams = reactive<Record<string, MediaStream | null>>({})
const videoRefs = reactive<Record<string, HTMLVideoElement | null>>({})
// 连接状态
const connectionStates = reactive<Record<string, string>>({})

// 检查用户是否有视频流
function hasVideoStream(userId: string): boolean {
  return webRTCManager.hasStreamVideo(videoStreams[userId])
}

// 本地媒体状态
const localVideoOpen = ref(true)
const localAudioOpen = ref(true)
const videoSwitching = ref(false)

// UI 状态
const showMembers = ref(false)
const showChat = ref(false)
const showInvite = ref(false)

// 邀请相关状态
const contacts = ref<UserContactVo[]>([])
const contactsLoading = ref(false)
const selectedContacts = ref<string[]>([])
const inviteSearchKeyword = ref('')
const inviteLoading = ref(false)

// 过滤后的联系人列表
const filteredContacts = computed(() => {
  if (!inviteSearchKeyword.value) {
    return contacts.value
  }
  const keyword = inviteSearchKeyword.value.toLowerCase()
  return contacts.value.filter(c => 
    c.contactNickName.toLowerCase().includes(keyword)
  )
})

// 监听邀请对话框打开，加载联系人列表
watch(showInvite, async (newVal) => {
  if (newVal) {
    // 重置状态
    selectedContacts.value = []
    inviteSearchKeyword.value = ''
    
    // 加载联系人列表
    contactsLoading.value = true
    try {
      contacts.value = await loadContactUser()
    } catch (error) {
      console.error('加载联系人失败:', error)
      ElMessage.error('加载联系人失败')
    } finally {
      contactsLoading.value = false
    }
  }
})

// 切换联系人选择状态
function toggleContactSelection(contactId: string) {
  const index = selectedContacts.value.indexOf(contactId)
  if (index === -1) {
    selectedContacts.value.push(contactId)
  } else {
    selectedContacts.value.splice(index, 1)
  }
}

// 确认邀请
async function confirmInvite() {
  if (selectedContacts.value.length === 0) {
    ElMessage.warning('请选择要邀请的联系人')
    return
  }
  
  inviteLoading.value = true
  try {
    await inviteContactToMeeting(selectedContacts.value)
    ElMessage.success(`已向 ${selectedContacts.value.length} 位联系人发送邀请`)
    showInvite.value = false
  } catch (error: any) {
    console.error('发送邀请失败:', error)
    ElMessage.error(error.message || '发送邀请失败')
  } finally {
    inviteLoading.value = false
  }
}

// 聊天消息
const chatMessages = ref<ChatMessage[]>([])
const chatLoading = ref(false)
const chatHasMore = ref(true)
const chatMinMessageId = ref<number | null>(null)

// 是否是创建者
const isCreator = computed(() => userStore.userId === creatorId.value)

// 计算视频网格样式
const gridClass = computed(() => {
  const count = members.value.length
  if (count <= 1) return 'grid-1'
  if (count <= 2) return 'grid-2'
  if (count <= 4) return 'grid-4'
  if (count <= 6) return 'grid-6'
  return 'grid-9'
})

// 设置视频元素引用
function setVideoRef(userId: string, el: any) {
  if (el) {
    videoRefs[userId] = el as HTMLVideoElement
    // 确保流被正确绑定
    const stream = videoStreams[userId]
    if (stream) {
      (el as HTMLVideoElement).srcObject = stream
    } else if (userId === userStore.userId) {
      // 如果是自己但流还没准备好，尝试从 webRTCManager 获取
      const localStream = webRTCManager.getLocalStream()
      if (localStream) {
        videoStreams[userId] = localStream
        ;(el as HTMLVideoElement).srcObject = localStream
      }
    }
  }
}

// 格式化时长
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// 返回主页
function handleBack() {
  router.push('/')
}

// 初始化本地媒体
async function initLocalMedia() {
  try {
    const stream = await webRTCManager.initLocalMedia(localVideoOpen.value, localAudioOpen.value)
    if (stream) {
      videoStreams[userStore.userId] = stream
      localVideoOpen.value = webRTCManager.hasStreamVideo(stream)
      localAudioOpen.value = webRTCManager.hasStreamAudio(stream)
      if (!localVideoOpen.value) {
        ElMessage.warning('摄像头不可用，已以音频模式入会')
      }
      await webRTCManager.refreshLocalTracks()
      await nextTick()
      if (videoRefs[userStore.userId]) {
        videoRefs[userStore.userId]!.srcObject = stream
      }
    } else {
      ElMessage.warning('无法获取摄像头/麦克风权限，请检查浏览器设置')
      localVideoOpen.value = false
      localAudioOpen.value = false
    }
  } catch (error: any) {
    console.error('初始化媒体失败:', error)
    
    // 根据错误给出具体提示
    if (!window.isSecureContext) {
      ElMessage.error('请使用 HTTPS 或 localhost 访问，否则无法使用摄像头')
    } else if (error.name === 'NotAllowedError') {
      ElMessage.warning('您拒绝了摄像头/麦克风权限，请在浏览器设置中允许')
    } else if (error.name === 'NotFoundError') {
      ElMessage.warning('未检测到摄像头或麦克风设备')
    } else if (error.name === 'NotReadableError') {
      ElMessage.warning('摄像头或麦克风被其他程序占用')
    } else {
      ElMessage.warning('无法获取摄像头/麦克风权限')
    }
    
    localVideoOpen.value = false
    localAudioOpen.value = false
  }
}

// 切换视频
async function toggleVideo() {
  if (videoSwitching.value) {
    return
  }

  const nextVideoOpen = !localVideoOpen.value
  videoSwitching.value = true

  try {
    const ok = await webRTCManager.toggleVideo(nextVideoOpen)
    if (!ok) {
      ElMessage.warning('无法开启摄像头，请检查设备占用或浏览器权限')
      return
    }

    localVideoOpen.value = nextVideoOpen

    const localStream = webRTCManager.getLocalStream()
    if (localStream) {
      videoStreams[userStore.userId] = localStream
      await nextTick()
      if (videoRefs[userStore.userId]) {
        videoRefs[userStore.userId]!.srcObject = localStream
      }
    }

    const self = members.value.find(m => m.userId === userStore.userId)
    if (self) {
      self.videoOpen = localVideoOpen.value
    }

    broadcastLocalVideoState()
  } catch (error: any) {
    console.error('切换视频失败:', error)
    if (!window.isSecureContext) {
      ElMessage.error('请使用 HTTPS 或 localhost 访问，否则无法使用摄像头')
    } else if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      ElMessage.error('当前浏览器环境不支持摄像头访问，请更换浏览器或使用 HTTPS/localhost')
    } else if (error.name === 'NotAllowedError') {
      ElMessage.warning('您拒绝了摄像头权限，请在浏览器设置中允许')
    } else if (error.name === 'NotFoundError') {
      ElMessage.warning('未检测到摄像头设备')
    } else if (error.name === 'NotReadableError') {
      ElMessage.warning('摄像头被其他程序占用')
    } else {
      ElMessage.warning('无法开启摄像头，请检查设备占用或浏览器权限')
    }
  } finally {
    videoSwitching.value = false
  }
}

function broadcastLocalVideoState() {
  wsService.send({
    messageSendToType: MessageSendToType.GROUP,
    meetingId: meetingId.value,
    messageType: MessageType.MEETING_USER_VIDEO_CHANGE,
    sendUserId: userStore.userId,
    messageContent: { videoOpen: localVideoOpen.value }
  })
}

// 切换音频
function toggleAudio() {
  localAudioOpen.value = !localAudioOpen.value
  webRTCManager.toggleAudio(localAudioOpen.value)
}

// 发送聊天消息
async function sendChatMessage(content: string, receiveUserId?: string) {
  const receiveId = receiveUserId || '0'  // "0" 表示群发
  const receiveType = receiveUserId ? 1 : 0
  
  // 本地添加消息（立即显示）
  chatMessages.value.push({
    sendUserId: userStore.userId,
    sendUserNickName: userStore.nickName,
    content: content,
    messageContent: content,
    sendTime: Date.now(),
    receiveType: receiveType,
    receiveUserId: receiveId
  })
  
  // 只通过 HTTP API 发送消息（后端会保存并通过 WebSocket 推送给其他人）
  // 不再通过 WebSocket 直接发送，避免消息重复
  try {
    await sendMeetingMessage(content, MessageType.CHAT_TEXT_MESSAGE, receiveId)
  } catch (error) {
    console.error('发送消息失败:', error)
  }
}

// 加载聊天历史消息
async function loadChatHistory() {
  console.log('loadChatHistory 被调用, chatLoading:', chatLoading.value)
  if (chatLoading.value) {
    console.log('chatLoading 为 true，跳过加载')
    return
  }
  
  chatLoading.value = true
  try {
    console.log('开始调用 loadMeetingMessages API...')
    const result = await loadMeetingMessages(1, 20)
    console.log('loadMeetingMessages 返回结果:', result)
    if (result.list && result.list.length > 0) {
      chatMessages.value = result.list.map(convertApiMessage).reverse()
      chatMinMessageId.value = Math.min(...result.list.map(m => m.messageId))
      chatHasMore.value = result.list.length >= 20
      console.log('聊天消息已加载，数量:', chatMessages.value.length)
    } else {
      chatHasMore.value = false
      console.log('没有聊天消息')
    }
  } catch (error) {
    console.error('加载聊天历史失败:', error)
  } finally {
    chatLoading.value = false
  }
}

// 加载更多历史消息
async function loadMoreChatHistory() {
  if (chatLoading.value || !chatHasMore.value || !chatMinMessageId.value) return
  
  chatLoading.value = true
  try {
    const result = await loadMoreMeetingMessages(chatMinMessageId.value, 20)
    if (result.list && result.list.length > 0) {
      const newMessages = result.list.map(convertApiMessage).reverse()
      chatMessages.value = [...newMessages, ...chatMessages.value]
      chatMinMessageId.value = Math.min(...result.list.map(m => m.messageId))
      chatHasMore.value = result.list.length >= 20
    } else {
      chatHasMore.value = false
    }
  } catch (error) {
    console.error('加载更多消息失败:', error)
  } finally {
    chatLoading.value = false
  }
}

// 转换 API 消息格式
function convertApiMessage(msg: ApiChatMessage): ChatMessage {
  return {
    messageId: msg.messageId,
    sendUserId: msg.sendUserId,
    sendUserNickName: msg.sendUserNickName,
    content: msg.messageContent,
    messageContent: msg.messageContent,
    sendTime: msg.sendTime,
    receiveType: msg.receiveType,
    receiveUserId: msg.receiveUserId
  }
}

// 踢出成员
async function handleKickMember(userId: string) {
  try {
    await ElMessageBox.confirm('确定要踢出该成员吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await kickOutMember(userId)
    ElMessage.success('已踢出该成员')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('踢出成员失败:', error)
    }
  }
}

// 拉黑成员
async function handleBlacklistMember(userId: string) {
  try {
    await ElMessageBox.confirm('确定要拉黑该成员吗？拉黑后该成员将无法重新加入会议。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await blacklistMember(userId)
    ElMessage.success('已拉黑该成员')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('拉黑成员失败:', error)
    }
  }
}

// 结束会议
async function handleEndMeeting() {
  try {
    await ElMessageBox.confirm('确定要结束会议吗？所有成员都将被移出会议。', '结束会议', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await finishMeeting()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('结束会议失败:', error)
    }
  }
}

// 离开会议
async function handleLeaveMeeting() {
  try {
    // 检查是否是最后一个人
    const isLastMember = members.value.length <= 1
    // 检查是否是创建者
    const isHost = userStore.userId === creatorId.value
    
    let confirmMessage = '确定要离开会议吗？'
    let confirmTitle = '离开会议'
    
    if (isLastMember) {
      confirmMessage = '您是会议中的最后一个成员，离开后会议将自动结束。确定要离开吗？'
      confirmTitle = '离开并结束会议'
    } else if (isHost) {
      confirmMessage = '您是会议主持人，离开后会议仍将继续。如需结束会议请点击"结束会议"按钮。确定要离开吗？'
    }
    
    await ElMessageBox.confirm(confirmMessage, confirmTitle, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: isLastMember ? 'warning' : 'info'
    })
    
    // 调用后端退出接口
    await exitMeeting()
    
    cleanup()
    router.push('/')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('离开会议失败:', error)
    }
  }
}

// 清理资源
function cleanup() {
  webRTCManager.cleanup()
  // 注意：不要断开 WebSocket 连接，因为是全局共享的
  // wsService.disconnect()
  if (durationTimer) {
    clearInterval(durationTimer)
    durationTimer = null
  }
}


// WebSocket 消息处理
function handleMemberJoin(message: WebSocketMessage<MeetingJoinContent>) {
  const content = message.messageContent
  if (content) {
    if (content.meetingMemberList && content.meetingMemberList.length > 0) {
      const localVideoState = localVideoOpen.value
      const localStream = webRTCManager.getLocalStream()
      
      // 保存现有的远程视频流
      const existingStreams: Record<string, MediaStream | null> = {}
      Object.keys(videoStreams).forEach(userId => {
        if (videoStreams[userId]) {
          existingStreams[userId] = videoStreams[userId]
        }
      })
      
      members.value = content.meetingMemberList.map(member => ({
        ...member,
        videoOpen: member.userId === userStore.userId ? localVideoState : member.videoOpen
      }))
      
      // 恢复所有视频流
      Object.keys(existingStreams).forEach(userId => {
        if (existingStreams[userId]) {
          videoStreams[userId] = existingStreams[userId]
        }
      })
      
      // 确保自己的视频流被保留
      if (localStream) {
        videoStreams[userStore.userId] = localStream
        nextTick(() => {
          if (videoRefs[userStore.userId]) {
            videoRefs[userStore.userId]!.srcObject = localStream
          }
        })
      }
      
      // 找到创建者
      const creator = members.value.find(m => m.memberType === MemberType.CREATOR)
      if (creator) {
        creatorId.value = creator.userId
      }
      
      // 与其他成员建立 WebRTC 连接
      // 策略：新加入的成员主动向所有现有成员发起连接
      // 判断是否是新成员：如果 newMember 是自己，说明自己刚加入
      const iAmNewMember = content.newMember?.userId === userStore.userId
      
      console.log('=== handleMemberJoin ===')
      console.log('My userId:', userStore.userId)
      console.log('newMember:', content.newMember?.userId)
      console.log('iAmNewMember:', iAmNewMember)
      console.log('Total members:', members.value.length)
      console.log('Current connections:', webRTCManager.getConnectionCount())
      
      // 新成员向所有现有成员发起连接，现有成员只响应 offer。
      // 避免双方同时发 offer 后触发 glare，导致首次协商只带上一侧媒体轨道。
      members.value.forEach(member => {
        if (member.userId !== userStore.userId) {
          const hasConnection = webRTCManager.hasConnection(member.userId)
          
          console.log(`Checking member ${member.userId}: hasConnection=${hasConnection}`)
          
          if (!hasConnection && iAmNewMember) {
            console.log('I am new member, will initiate connection to:', member.userId)
            setTimeout(() => {
              if (!webRTCManager.hasConnection(member.userId)) {
                console.log('Initiating delayed connection to:', member.userId)
                webRTCManager.initiateConnection(member.userId)
              } else {
                console.log('Connection already exists with:', member.userId)
              }
            }, 800)
          } else if (!iAmNewMember && content.newMember?.userId === member.userId) {
            console.log('New member joined:', member.userId, '- waiting for their offer')
          }
        }
      })
    }
    
    if (content.newMember && content.newMember.userId !== userStore.userId) {
      ElMessage.info(`${content.newMember.nickName} 加入了会议`)
    }
  }
}

function handleMemberExit(message: WebSocketMessage<MeetingExitContent>) {
  const content = message.messageContent
  const exitUserId = content?.exitUserId || message.sendUserId
  
  if (exitUserId) {
    // 检查是否是自己被踢出或拉黑
    if (exitUserId === userStore.userId) {
      const exitStatus = content?.exitStatus
      if (exitStatus === MemberStatus.KICK_OUT) {
        ElMessage.warning('您已被移出会议')
        cleanup()
        router.push('/')
        return
      } else if (exitStatus === MemberStatus.BLACKLIST) {
        ElMessage.error('您已被拉黑，无法重新加入此会议')
        cleanup()
        router.push('/')
        return
      }
      // 正常退出（EXIT_MEETING）不需要处理，因为是自己主动离开的
      return
    }
    
    members.value = members.value.filter(m => m.userId !== exitUserId)
    webRTCManager.closeConnection(exitUserId)
    delete videoStreams[exitUserId]
    
    const nickName = message.sendUserNickName || '成员'
    ElMessage.info(`${nickName} 离开了会议`)
  }
}

function handleVideoChange(message: WebSocketMessage) {
  const userId = message.sendUserId
  const content = message.messageContent as { videoOpen: boolean }
  if (userId && content) {
    const member = members.value.find(m => m.userId === userId)
    if (member) {
      member.videoOpen = content.videoOpen
    }
  }
}

function handleChatMessage(message: WebSocketMessage) {
  // 只处理其他人发送的消息（自己发送的已经在本地添加了）
  if (message.sendUserId !== userStore.userId) {
    // 检查是否是私聊消息
    const receiveType = (message.messageContent as any)?.receiveType || 0
    const receiveUserId = (message as any).receiveUserId || '0'
    
    // 如果是私聊消息，只有目标用户才能看到
    if (receiveType === 1 && receiveUserId !== userStore.userId) {
      return
    }
    
    chatMessages.value.push({
      sendUserId: message.sendUserId || '',
      sendUserNickName: message.sendUserNickName || '',
      content: message.messageContent as string,
      messageContent: message.messageContent as string,
      sendTime: message.sendTime || Date.now(),
      receiveType: receiveType,
      receiveUserId: receiveUserId
    })
  }
}

function handleMeetingEnd(_message: WebSocketMessage) {
  ElMessage.warning('会议已结束')
  cleanup()
  router.push('/')
}

// 远程流回调
function onRemoteStream(userId: string, stream: MediaStream) {
  console.log('Received remote stream for user:', userId, 'tracks:', stream.getTracks().length)
  
  // 使用 Vue 的响应式方式设置流
  videoStreams[userId] = stream
  
  const hasVideo = webRTCManager.hasStreamVideo(stream)
  const member = members.value.find(m => m.userId === userId)
  if (member) {
    member.videoOpen = hasVideo
    console.log('Set videoOpen for member:', userId, hasVideo)
  } else {
    console.warn('Member not found for userId:', userId)
  }
  
  nextTick(() => {
    if (videoRefs[userId]) {
      videoRefs[userId]!.srcObject = stream
      console.log('Set srcObject for user:', userId)
    } else {
      console.log('Video ref not found for user:', userId, 'will retry...')
      // 如果 ref 还没准备好，稍后重试
      setTimeout(() => {
        if (videoRefs[userId]) {
          videoRefs[userId]!.srcObject = stream
          console.log('Retry: Set srcObject for user:', userId)
        } else {
          console.error('Video ref still not found after retry for user:', userId)
        }
      }, 500)
    }
  })
}

function onStreamRemoved(userId: string) {
  delete videoStreams[userId]
  delete connectionStates[userId]
}

function onConnectionStateChange(userId: string, state: string) {
  console.log('Connection state changed for user:', userId, 'state:', state)
  connectionStates[userId] = state
}

// 初始化
onMounted(async () => {
  meetingId.value = route.params.meetingId as string
  if (!meetingId.value) {
    ElMessage.error('会议ID无效')
    router.push('/')
    return
  }

  // 获取会议信息
  try {
    const meeting = await getCurrentMeeting()
    if (meeting) {
      meetingName.value = meeting.meetingName
      meetingNo.value = meeting.meetingNo
      creatorId.value = meeting.createUserId
    }
  } catch (error) {
    console.error('获取会议信息失败:', error)
  }

  // 初始化 WebRTC 管理器
  webRTCManager.init(meetingId.value, userStore.userId, onRemoteStream, onStreamRemoved, onConnectionStateChange)

  // 【重要】先初始化本地媒体，确保在收到成员列表消息前 localStream 已准备好
  await initLocalMedia()

  // 先添加自己到成员列表
  members.value = [{
    userId: userStore.userId,
    nickName: userStore.nickName,
    joinTime: Date.now(),
    memberType: MemberType.NORMAL,
    status: 0,
    videoOpen: localVideoOpen.value,
    sex: userStore.sex
  }]

  // 【重要】在本地媒体准备好之后再注册 WebSocket 消息处理器
  // 这样当收到 ADD_MEETING_ROOM 消息时，localStream 已经可用
  wsService.on(MessageType.ADD_MEETING_ROOM, handleMemberJoin)
  wsService.on(MessageType.EXIT_MEETING_ROOM, handleMemberExit)
  wsService.on(MessageType.MEETING_USER_VIDEO_CHANGE, handleVideoChange)
  wsService.on(MessageType.CHAT_TEXT_MESSAGE, handleChatMessage)
  wsService.on(MessageType.FINISH_MEETING, handleMeetingEnd)

  // 等待 WebSocket 连接就绪（App.vue 负责全局连接）
  // 不再在这里调用 connect()，避免重复连接导致用户重复加入会议房间
  if (!wsService.isConnected) {
    console.log('等待 WebSocket 连接就绪...')
    // 等待最多 5 秒
    let waitTime = 0
    const maxWaitTime = 5000
    const checkInterval = 100
    while (!wsService.isConnected && waitTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval))
      waitTime += checkInterval
    }
    
    if (!wsService.isConnected) {
      console.error('WebSocket 连接超时')
      ElMessage.error('连接会议服务器失败，请刷新页面重试')
      return
    }
  }
  console.log('WebSocket 已连接，复用现有连接')

  broadcastLocalVideoState()
  
  // 【关键修复】无论 WebSocket 是新连接还是已连接，都发送 INIT 消息
  // 这解决了以下场景：
  // 1. 页面刷新：WebSocket 已连接，但 handleMemberJoin 还没注册时 ADD_MEETING_ROOM 消息已发送
  // 2. 离开会议后重新加入：WebSocket 已连接，Channel 上的 currentMeetingId 是旧的
  // 后端 InitMessageHandler 会从 Redis 获取最新的 currentMeetingId 并发送成员列表
  console.log('Requesting meeting member list via INIT message...')
  wsService.send({
    messageSendToType: MessageSendToType.GROUP,
    meetingId: meetingId.value,
    messageType: MessageType.INIT,
    sendUserId: userStore.userId
  })

  // 开始计时
  durationTimer = window.setInterval(() => {
    duration.value++
  }, 1000)
  
  // 预加载聊天历史（解决从主页重新进入会议时聊天记录不显示的问题）
  console.log('预加载聊天历史...')
  try {
    await loadChatHistory()
    console.log('聊天历史加载完成，消息数量:', chatMessages.value.length)
  } catch (error) {
    console.error('预加载聊天历史失败:', error)
  }
})

onUnmounted(() => {
  if (durationTimer) {
    clearInterval(durationTimer)
  }
  webRTCManager.cleanup()
  
  wsService.off(MessageType.ADD_MEETING_ROOM, handleMemberJoin)
  wsService.off(MessageType.EXIT_MEETING_ROOM, handleMemberExit)
  wsService.off(MessageType.MEETING_USER_VIDEO_CHANGE, handleVideoChange)
  wsService.off(MessageType.CHAT_TEXT_MESSAGE, handleChatMessage)
  wsService.off(MessageType.FINISH_MEETING, handleMeetingEnd)
})
</script>


<style scoped>
.meeting-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #0a0a0a;
  color: var(--color-text-white);
  font-family: var(--font-family);
}

/* 顶部工具栏 - 极简风格 */
.meeting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-xl);
  background-color: rgba(10, 10, 10, 0.98);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.back-btn {
  color: rgba(255, 255, 255, 0.7);
  font-size: var(--font-size-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.back-btn:hover {
  color: var(--color-text-white);
  background: rgba(255, 255, 255, 0.08);
}

.meeting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meeting-name {
  font-size: var(--font-size-lg);
  font-weight: 600;
  letter-spacing: -0.02em;
}

.meeting-id {
  font-size: var(--font-size-xs);
  color: rgba(255, 255, 255, 0.5);
  font-weight: 400;
}

.meeting-time {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: rgba(255, 255, 255, 0.6);
  padding: var(--spacing-xs) var(--spacing-md);
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-full);
}

/* 视频区域 */
.video-area {
  flex: 1;
  padding: var(--spacing-lg);
  overflow: hidden;
  background: linear-gradient(180deg, #0a0a0a 0%, #111111 100%);
}

.video-grid {
  display: grid;
  gap: var(--spacing-md);
  height: 100%;
}

.video-grid.grid-1 {
  grid-template-columns: 1fr;
  max-width: 1200px;
  margin: 0 auto;
}

.video-grid.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.video-grid.grid-4 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.video-grid.grid-6 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.video-grid.grid-9 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
}

.video-item {
  position: relative;
  background-color: #1a1a1a;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all var(--transition-normal);
}

.video-item:hover {
  border-color: rgba(255, 255, 255, 0.12);
}

.video-item.is-self {
  border: 2px solid var(--color-accent);
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.15);
}

.video-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1a1a1a 0%, #252525 100%);
}

.video-placeholder .avatar {
  width: 88px;
  height: 88px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-accent) 0%, #b8962e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-3xl);
  font-weight: 600;
  color: #0a0a0a;
  box-shadow: 0 4px 20px rgba(212, 175, 55, 0.3);
}

.member-info {
  position: absolute;
  bottom: var(--spacing-md);
  left: var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.member-info .video-off {
  color: var(--color-error);
}

.connection-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 4px;
  color: white;
  font-size: 14px;
  z-index: 10;
}

.connection-state.failed, .connection-state.disconnected {
  color: #f56c6c;
  border: 1px solid #f56c6c;
}

.connection-state.checking, .connection-state.connecting {
  color: #e6a23c;
  border: 1px solid #e6a23c;
}

/* 底部控制栏 - 现代极简风格 */
.meeting-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg) var(--spacing-xl);
  background-color: rgba(10, 10, 10, 0.98);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
}

.control-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
  min-width: 72px;
}

.control-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.control-item span {
  font-size: var(--font-size-xs);
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
  white-space: nowrap;
}

.control-item .el-icon {
  color: var(--color-text-white);
  transition: all var(--transition-fast);
}

.control-item:hover .el-icon {
  color: var(--color-accent);
  transform: scale(1.1);
}

.control-item:hover span {
  color: rgba(255, 255, 255, 0.9);
}

.control-item .is-off {
  color: var(--color-error);
}

.control-item.end-meeting {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.control-item.end-meeting .el-icon {
  color: var(--color-error);
}

.control-item.end-meeting:hover {
  background-color: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
}

.control-item.end-meeting span {
  color: var(--color-error);
}

.control-item.leave {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.control-item.leave .el-icon {
  color: var(--color-warning);
}

.control-item.leave:hover {
  background-color: rgba(245, 158, 11, 0.2);
  border-color: rgba(245, 158, 11, 0.4);
}

.control-item.leave span {
  color: var(--color-warning);
}

/* Drawer 样式覆盖 - 保持一致的设计语言 */
:deep(.el-drawer) {
  background: var(--color-bg-white);
  border-left: 1px solid var(--color-border);
}

:deep(.el-drawer__header) {
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 0;
  padding: var(--spacing-lg) var(--spacing-xl);
}

:deep(.el-drawer__title) {
  color: var(--color-text-primary);
  font-weight: 600;
  font-size: var(--font-size-lg);
}

:deep(.el-drawer__body) {
  padding: 0;
}

:deep(.el-drawer__close-btn) {
  color: var(--color-text-secondary);
}

:deep(.el-drawer__close-btn:hover) {
  color: var(--color-text-primary);
}

/* 邀请对话框样式 */
.invite-dialog {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.invite-search {
  margin-bottom: var(--spacing-sm);
}

.contact-list {
  max-height: 360px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.contact-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.contact-item:hover {
  background-color: var(--color-bg-secondary);
}

.contact-item.is-selected {
  background-color: rgba(212, 175, 55, 0.1);
  border-color: var(--color-accent);
}

.contact-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-accent) 0%, #b8962e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-md);
  font-weight: 600;
  color: #0a0a0a;
  flex-shrink: 0;
}

.contact-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.contact-name {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.contact-status {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.contact-status.is-online {
  color: var(--color-success);
}

.check-icon {
  color: var(--color-accent);
  font-size: 18px;
}

:deep(.el-dialog__footer) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-md);
}

.selected-count {
  margin-right: auto;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
