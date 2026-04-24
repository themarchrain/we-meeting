<template>
  <AppShell>
    <div class="home-page">
      <section class="welcome-panel">
        <div>
          <p class="welcome-eyebrow">{{ todayText }}</p>
          <h1>{{ greeting }}，{{ userStore.nickName || '欢迎回来' }}</h1>
          <p class="welcome-subtitle">准备好下一场会议，或快速回到今天的工作节奏。</p>
        </div>
        <div class="welcome-meta">
          <div class="meta-pill">
            <span>个人会议号</span>
            <strong>{{ userStore.meetingNo || '--' }}</strong>
          </div>
          <div class="meta-pill">
            <span>今日待开</span>
            <strong>{{ meetingsLoading ? '--' : todayUpcomingCount }}</strong>
          </div>
          <div class="meta-pill">
            <span>今日完成</span>
            <strong>{{ historyLoading ? '--' : todayFinishedCount }}</strong>
          </div>
        </div>
      </section>

      <!-- Current Meeting Banner -->
      <CurrentMeetingCard 
        v-if="currentMeeting" 
        :meeting="currentMeeting" 
        @rejoin="handleRejoinMeeting" 
      />
      
      <div class="home-content">
        <!-- Action Panel -->
        <div class="action-panel">
          <div class="panel-header">
            <div>
              <p class="panel-eyebrow">Quick actions</p>
              <h2 class="panel-title">快速开始</h2>
            </div>
            <span class="panel-note">常用会议操作</span>
          </div>
          <div class="action-grid">
            <ActionCard label="加入会议" description="输入会议号，快速进入正在进行的会议。" :icon="Plus" @click="handleJoinMeeting" />
            <ActionCard label="快速会议" description="立即创建会议，并邀请联系人加入。" :icon="VideoCamera" @click="handleStartMeeting" />
            <ActionCard label="预定会议" description="安排稍后的会议，提前准备日程。" :icon="Calendar" @click="handleScheduleMeeting" />
            <ActionCard label="历史会议" description="查看会议记录、成员和持续时间。" :icon="Clock" @click="handleHistoryMeeting" />
          </div>
        </div>
        
        <!-- Schedule Panel -->
        <SchedulePanel
          :meetings="todayMeetings"
          :loading="meetingsLoading"
          @meeting-click="handleMeetingClick"
          @view-all="handleViewAllMeetings"
        />
      </div>
    </div>
    
    <!-- Quick Meeting Dialog -->
    <el-dialog v-model="quickMeetingDialogVisible" title="发起会议" width="450px" :close-on-click-modal="false">
      <el-form :model="quickMeetingForm" label-width="100px">
        <el-form-item label="会议号类型">
          <el-radio-group v-model="quickMeetingForm.meetingNoType">
            <el-radio :value="0">使用个人会议号</el-radio>
            <el-radio :value="1">系统生成会议号</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="会议主题" required>
          <el-input v-model="quickMeetingForm.meetingName" placeholder="请输入会议主题" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="会议密码">
          <el-input v-model="quickMeetingForm.joinPassword" placeholder="可选，最多5位" maxlength="5" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quickMeetingDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="quickMeetingLoading" @click="confirmQuickMeeting">创建会议</el-button>
      </template>
    </el-dialog>

    <!-- Join Meeting Dialog -->
    <el-dialog v-model="joinDialogVisible" title="加入会议" width="400px" :close-on-click-modal="false">
      <el-form :model="joinMeetingForm" label-width="100px">
        <el-form-item label="会议号" required>
          <el-input v-model="joinMeetingForm.meetingNo" placeholder="请输入10位会议号" maxlength="10" />
        </el-form-item>
        <el-form-item label="昵称" required>
          <el-input v-model="joinMeetingForm.nickName" placeholder="请输入昵称" maxlength="20" />
        </el-form-item>
        <el-form-item label="会议密码">
          <el-input v-model="joinMeetingForm.joinPassword" placeholder="如需密码请输入" maxlength="5" show-password />
        </el-form-item>
        <el-form-item label="开启摄像头">
          <el-switch v-model="joinMeetingForm.videoOpen" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="joinDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="joinMeetingLoading" @click="confirmJoin">加入会议</el-button>
      </template>
    </el-dialog>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { VideoCamera, Plus, Calendar, Clock } from '@element-plus/icons-vue'
import AppShell from '@/components/AppShell.vue'
import ActionCard from '@/components/ActionCard.vue'
import SchedulePanel from '@/components/SchedulePanel.vue'
import CurrentMeetingCard from '@/components/CurrentMeetingCard.vue'
import type { ScheduleMeeting } from '@/components/SchedulePanel.vue'
import { useUserStore } from '@/stores/user'
import { quickMeeting, joinMeeting, preJoinMeeting, getCurrentMeeting, loadMeeting } from '@/api/meeting'
import { loadTodayMeeting } from '@/api/reserve'
import type { QuickMeetingForm, JoinMeetingForm, MeetingInfo } from '@/types'

const router = useRouter()
const userStore = useUserStore()

const now = new Date()
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
})
const todayText = computed(() => {
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${month}月${day}日 ${weekdays[now.getDay()]}`
})

// Current meeting state
const currentMeeting = ref<MeetingInfo | null>(null)

// Today's meetings
const todayMeetings = ref<ScheduleMeeting[]>([])
const meetingsLoading = ref(false)
const historyLoading = ref(false)
const todayFinishedCount = ref(0)
const todayUpcomingCount = computed(() => {
  return todayMeetings.value.filter(meeting => meeting.status === 'upcoming').length
})

// Quick meeting dialog
const quickMeetingDialogVisible = ref(false)
const quickMeetingLoading = ref(false)
const quickMeetingForm = reactive<QuickMeetingForm>({
  meetingNoType: 0,
  meetingName: '',
  joinType: 0,
  joinPassword: ''
})

// Join meeting dialog
const joinDialogVisible = ref(false)
const joinMeetingLoading = ref(false)
const joinMeetingForm = reactive<JoinMeetingForm>({
  meetingNo: '',
  nickName: '',
  joinPassword: '',
  videoOpen: true
})

// Load current meeting (使用缓存避免重复请求)
let currentMeetingPromise: Promise<MeetingInfo | null> | null = null

async function loadCurrentMeeting() {
  try {
    // 如果已有请求在进行中，复用它
    if (!currentMeetingPromise) {
      currentMeetingPromise = getCurrentMeeting()
    }
    currentMeeting.value = await currentMeetingPromise
  } catch (error) {
    console.error('获取当前会议失败:', error)
  } finally {
    currentMeetingPromise = null
  }
}

// Load today's meetings
async function loadTodayMeetings() {
  meetingsLoading.value = true
  try {
    const reserves = await loadTodayMeeting()
    // 转换为 ScheduleMeeting 格式，使用数据库 status 字段判断状态
    todayMeetings.value = reserves.map(reserve => ({
      id: reserve.meetingId,
      name: reserve.meetingName,
      meetingNo: reserve.realMeetingId || reserve.meetingId,
      startTime: reserve.startTime,
      duration: reserve.duration,
      status: getReserveStatus(reserve.status),
      realMeetingId: reserve.realMeetingId
    }))
  } catch (error) {
    console.error('获取今日会议失败:', error)
  } finally {
    meetingsLoading.value = false
  }
}

async function loadTodayFinishedMeetings() {
  historyLoading.value = true
  try {
    const result = await loadMeeting({ pageNo: 1, pageSize: 100 })
    todayFinishedCount.value = result.list.filter(meeting =>
      meeting.status === 1 && isToday(meeting.endTime || meeting.startTime || meeting.createTime)
    ).length
  } catch (error) {
    console.error('获取今日完成会议失败:', error)
    todayFinishedCount.value = 0
  } finally {
    historyLoading.value = false
  }
}

// 根据数据库 status 字段获取会议状态
// 0: 待开始, 1: 进行中, 2: 已结束, 3: 已取消
function getReserveStatus(status: number): 'ongoing' | 'upcoming' | 'ended' {
  switch (status) {
    case 1: return 'ongoing'
    case 2: return 'ended'
    case 3: return 'ended'
    default: return 'upcoming'
  }
}

function isToday(dateStr?: string) {
  if (!dateStr) return false
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return false
  return date.toDateString() === new Date().toDateString()
}

// Rejoin meeting
function handleRejoinMeeting(meetingId: string) {
  router.push(`/meeting/${meetingId}`)
}

// Reset forms
function resetQuickMeetingForm() {
  quickMeetingForm.meetingNoType = 0
  quickMeetingForm.meetingName = ''
  quickMeetingForm.joinType = 0
  quickMeetingForm.joinPassword = ''
}

function resetJoinMeetingForm() {
  joinMeetingForm.meetingNo = ''
  joinMeetingForm.nickName = userStore.nickName || ''
  joinMeetingForm.joinPassword = ''
  joinMeetingForm.videoOpen = true
}

// Action handlers
function handleStartMeeting() {
  if (currentMeeting.value) {
    ElMessage.warning('您有正在进行的会议，请先结束或退出当前会议')
    return
  }
  resetQuickMeetingForm()
  quickMeetingDialogVisible.value = true
}

function handleJoinMeeting() {
  if (currentMeeting.value) {
    router.push(`/meeting/${currentMeeting.value.meetingId}`)
    return
  }
  resetJoinMeetingForm()
  joinDialogVisible.value = true
}

function handleScheduleMeeting() {
  router.push('/schedule')
}

function handleHistoryMeeting() {
  router.push('/history')
}

// Confirm quick meeting
async function confirmQuickMeeting() {
  if (!quickMeetingForm.meetingName.trim()) {
    ElMessage.warning('请输入会议主题')
    return
  }
  quickMeetingLoading.value = true
  try {
    const meetingId = await quickMeeting({
      meetingNoType: quickMeetingForm.meetingNoType,
      meetingName: quickMeetingForm.meetingName.trim(),
      joinType: quickMeetingForm.joinType,
      joinPassword: quickMeetingForm.joinPassword || undefined
    })
    await joinMeeting({ videoOpen: true })
    ElMessage.success('会议创建成功')
    quickMeetingDialogVisible.value = false
    router.push(`/meeting/${meetingId}`)
  } catch (error) {
    console.error('创建会议失败:', error)
  } finally {
    quickMeetingLoading.value = false
  }
}

// Confirm join meeting
async function confirmJoin() {
  if (!/^\d{10}$/.test(joinMeetingForm.meetingNo)) {
    ElMessage.warning('请输入10位会议号')
    return
  }
  if (!joinMeetingForm.nickName.trim()) {
    ElMessage.warning('请输入昵称')
    return
  }
  joinMeetingLoading.value = true
  try {
    const meetingId = await preJoinMeeting({
      meetingNo: joinMeetingForm.meetingNo,
      nickName: joinMeetingForm.nickName.trim(),
      password: joinMeetingForm.joinPassword || undefined
    })
    await joinMeeting({ videoOpen: joinMeetingForm.videoOpen })
    ElMessage.success('加入会议成功')
    joinDialogVisible.value = false
    router.push(`/meeting/${meetingId}`)
  } catch (error) {
    console.error('加入会议失败:', error)
  } finally {
    joinMeetingLoading.value = false
  }
}

// Meeting list handlers
function handleMeetingClick(meeting: ScheduleMeeting) {
  joinMeetingForm.meetingNo = meeting.meetingNo
  joinMeetingForm.nickName = userStore.nickName || ''
  joinDialogVisible.value = true
}

function handleViewAllMeetings() {
  router.push('/history')
}

// Initialize - 并行加载数据
onMounted(() => {
  Promise.all([
    loadCurrentMeeting(),
    loadTodayMeetings(),
    loadTodayFinishedMeetings()
  ])
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  padding: var(--spacing-xl);
  background: var(--color-bg-light);
}

.welcome-panel {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--spacing-xl);
  max-width: 1240px;
  margin: 0 auto var(--spacing-lg);
  padding: var(--spacing-xl);
  background:
    linear-gradient(135deg, rgba(20, 184, 166, 0.12), rgba(255, 255, 255, 0) 46%),
    var(--color-bg-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.welcome-eyebrow,
.panel-eyebrow {
  margin-bottom: var(--spacing-xs);
  color: var(--color-accent);
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-transform: uppercase;
}

.welcome-panel h1 {
  font-size: var(--font-size-3xl);
  letter-spacing: 0;
}

.welcome-subtitle {
  margin-top: var(--spacing-sm);
  color: var(--color-text-muted);
}

.welcome-meta {
  display: flex;
  gap: var(--spacing-sm);
}

.meta-pill {
  min-width: 128px;
  padding: var(--spacing-md);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
}

.meta-pill span,
.meta-pill strong {
  display: block;
}

.meta-pill span {
  margin-bottom: var(--spacing-xs);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.meta-pill strong {
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
}

.home-content {
  display: grid;
  grid-template-columns: minmax(620px, 1fr) 360px;
  gap: var(--spacing-xl);
  max-width: 1240px;
  margin: 0 auto;
  align-items: stretch;
}

.action-panel {
  background: var(--color-bg-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-xl);
}

.panel-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.panel-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.panel-note {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

/* Responsive */
@media (max-width: 1200px) {
  .home-content {
    grid-template-columns: 1fr;
  }

  .welcome-panel {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
