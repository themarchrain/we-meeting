<template>
  <AppShell>
    <div class="history-page">
      <div class="page-header">
        <div>
          <p class="page-eyebrow">Meeting archive</p>
          <h1 class="page-title">会议记录</h1>
        </div>
        <div class="page-summary">
          <span>{{ total }} 条记录</span>
        </div>
      </div>

      <div class="tab-filter">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-btn"
          :class="{ active: activeTab === tab.value }"
          @click="handleTabChange(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="meeting-list">
        <div v-if="loading && meetings.length === 0" class="loading-state">
          <div class="skeleton-card" v-for="i in 3" :key="i"></div>
        </div>

        <div v-else-if="meetings.length === 0" class="empty-state">
          <el-icon :size="48"><Calendar /></el-icon>
          <p>暂无会议记录</p>
        </div>

        <div v-else class="meeting-cards">
          <article
            v-for="meeting in meetings"
            :key="meeting.meetingId"
            class="meeting-card"
            tabindex="0"
            @click="openMeetingDetail(meeting)"
            @keydown.enter="openMeetingDetail(meeting)"
          >
            <div class="card-header">
              <div class="title-block">
                <span class="meeting-name">{{ meeting.meetingName || '未命名会议' }}</span>
                <span class="meeting-no"># {{ meeting.meetingNo }}</span>
              </div>
              <span class="status-badge" :class="getStatusClass(meeting.status)">
                {{ getStatusText(meeting.status) }}
              </span>
            </div>

            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">创建时间</span>
                <strong>{{ formatDateTime(meeting.createTime) }}</strong>
              </div>
              <div class="meta-item">
                <span class="meta-label">开始时间</span>
                <strong>{{ formatDateTime(meeting.startTime) }}</strong>
              </div>
              <div class="meta-item">
                <span class="meta-label">结束时间</span>
                <strong>{{ formatDateTime(meeting.endTime) }}</strong>
              </div>
              <div class="meta-item">
                <span class="meta-label">持续时间</span>
                <strong>{{ formatDuration(meeting.startTime, meeting.endTime, meeting.status) }}</strong>
              </div>
            </div>

            <div class="card-footer">
              <span class="join-type">{{ getJoinTypeText(meeting.joinType) }}</span>
              <span class="creator">创建者 {{ shortId(meeting.createUserId) }}</span>
              <el-button
                v-if="meeting.status === 0"
                type="primary"
                size="small"
                @click.stop="rejoinMeeting(meeting)"
              >
                重新加入
              </el-button>
            </div>
          </article>
        </div>

        <div v-if="hasMore && meetings.length > 0" class="load-more">
          <el-button :loading="loading" @click="loadMore">加载更多</el-button>
        </div>
      </div>
    </div>

    <el-drawer v-model="detailVisible" title="会议详情" direction="rtl" size="420px">
      <div v-if="selectedMeeting" class="detail-panel">
        <div class="detail-heading">
          <span class="status-badge" :class="getStatusClass(selectedMeeting.status)">
            {{ getStatusText(selectedMeeting.status) }}
          </span>
          <h2>{{ selectedMeeting.meetingName || '未命名会议' }}</h2>
          <p>会议号 {{ selectedMeeting.meetingNo }}</p>
        </div>

        <div class="detail-section">
          <h3>时间</h3>
          <div class="detail-row">
            <span>创建时间</span>
            <strong>{{ formatFullDateTime(selectedMeeting.createTime) }}</strong>
          </div>
          <div class="detail-row">
            <span>开始时间</span>
            <strong>{{ formatFullDateTime(selectedMeeting.startTime) }}</strong>
          </div>
          <div class="detail-row">
            <span>结束时间</span>
            <strong>{{ formatFullDateTime(selectedMeeting.endTime) }}</strong>
          </div>
          <div class="detail-row">
            <span>持续时间</span>
            <strong>{{ formatDuration(selectedMeeting.startTime, selectedMeeting.endTime, selectedMeeting.status) }}</strong>
          </div>
        </div>

        <div class="detail-section">
          <h3>会议信息</h3>
          <div class="detail-row">
            <span>会议 ID</span>
            <strong>{{ selectedMeeting.meetingId }}</strong>
          </div>
          <div class="detail-row">
            <span>创建者</span>
            <strong>{{ selectedMeeting.createUserId }}</strong>
          </div>
          <div class="detail-row">
            <span>加入方式</span>
            <strong>{{ getJoinTypeText(selectedMeeting.joinType) }}</strong>
          </div>
          <div class="detail-row">
            <span>会议密码</span>
            <strong>{{ selectedMeeting.joinPassword ? '已设置' : '未设置' }}</strong>
          </div>
        </div>

        <div class="detail-section">
          <h3>成员</h3>
          <div v-if="membersLoading" class="member-loading">正在加载成员...</div>
          <div v-else-if="meetingMembers.length === 0" class="member-empty">暂无成员记录</div>
          <div v-else class="member-list">
            <div v-for="member in meetingMembers" :key="member.userId" class="member-item">
              <div class="member-avatar">{{ getInitial(member.nickName || member.userId) }}</div>
              <div>
                <strong>{{ member.nickName || member.userId }}</strong>
                <span>{{ getMemberTypeText(member.memberType) }} · {{ formatDateTime(member.lastJoinTime) }}</span>
              </div>
            </div>
          </div>
        </div>

        <el-button
          v-if="selectedMeeting.status === 0"
          class="detail-action"
          type="primary"
          @click="rejoinMeeting(selectedMeeting)"
        >
          重新加入会议
        </el-button>
      </div>
    </el-drawer>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar } from '@element-plus/icons-vue'
import AppShell from '@/components/AppShell.vue'
import {
  loadMeeting,
  loadMeetingMembers,
  loadMyCreatedMeeting,
  loadMyJoinedMeeting,
  joinMeeting,
  reserveJoinMeeting
} from '@/api/meeting'
import { useUserStore } from '@/stores/user'
import type { MeetingInfo, MeetingMemberRecord } from '@/types'

defineOptions({
  name: 'History'
})

const router = useRouter()
const userStore = useUserStore()

const tabs = [
  { label: '全部', value: 'all' },
  { label: '我创建的', value: 'created' },
  { label: '我参加的', value: 'joined' }
]

const activeTab = ref('all')
const meetings = ref<MeetingInfo[]>([])
const selectedMeeting = ref<MeetingInfo | null>(null)
const meetingMembers = ref<MeetingMemberRecord[]>([])
const detailVisible = ref(false)
const membersLoading = ref(false)
const loading = ref(false)
const pageNo = ref(1)
const pageSize = 10
const total = ref(0)
const hasLoaded = ref(false)

const hasMore = computed(() => meetings.value.length < total.value)

async function fetchMeetings(reset = false) {
  if (reset) {
    pageNo.value = 1
    meetings.value = []
  }

  loading.value = true
  try {
    const params = { pageNo: pageNo.value, pageSize }
    let result

    switch (activeTab.value) {
      case 'created':
        result = await loadMyCreatedMeeting(params)
        break
      case 'joined':
        result = await loadMyJoinedMeeting(params)
        break
      default:
        result = await loadMeeting(params)
    }

    if (reset) {
      meetings.value = result.list
    } else {
      meetings.value.push(...result.list)
    }
    total.value = result.total
  } catch {
    // 错误已在拦截器中处理
  } finally {
    loading.value = false
  }
}

function handleTabChange(tab: string) {
  activeTab.value = tab
  fetchMeetings(true)
}

function loadMore() {
  pageNo.value++
  fetchMeetings()
}

async function openMeetingDetail(meeting: MeetingInfo) {
  selectedMeeting.value = meeting
  detailVisible.value = true
  meetingMembers.value = []
  membersLoading.value = true
  try {
    meetingMembers.value = await loadMeetingMembers(meeting.meetingId)
  } catch {
    meetingMembers.value = []
  } finally {
    membersLoading.value = false
  }
}

async function rejoinMeeting(meeting: MeetingInfo) {
  try {
    const nickName = userStore.nickName || '用户'
    await reserveJoinMeeting(meeting.meetingId, nickName)
    await joinMeeting({ videoOpen: true })
    router.push(`/meeting/${meeting.meetingId}`)
  } catch (error) {
    console.error('重新加入会议失败:', error)
  }
}

function parseDate(dateStr?: string) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateTime(dateStr?: string) {
  const date = parseDate(dateStr)
  if (!date) return '--'
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hours}:${minutes}`
}

function formatFullDateTime(dateStr?: string) {
  const date = parseDate(dateStr)
  if (!date) return '--'
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function formatDuration(startTime?: string, endTime?: string, status?: number) {
  const start = parseDate(startTime)
  const end = parseDate(endTime)
  if (!start) return '--'

  const effectiveEnd = end || (status === 0 ? new Date() : null)
  if (!effectiveEnd) return '--'

  const totalMinutes = Math.max(0, Math.floor((effectiveEnd.getTime() - start.getTime()) / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}小时${minutes}分钟`
  return `${minutes}分钟`
}

function getStatusClass(status: number) {
  switch (status) {
    case 0: return 'ongoing'
    case 1: return 'ended'
    default: return 'ended'
  }
}

function getStatusText(status: number) {
  switch (status) {
    case 0: return '进行中'
    case 1: return '已结束'
    default: return '已结束'
  }
}

function getJoinTypeText(joinType?: number) {
  return joinType === 1 ? '需要密码' : '无需密码'
}

function getMemberTypeText(memberType?: number) {
  return memberType === 1 ? '主持人' : '参会人'
}

function shortId(id?: string) {
  if (!id) return '--'
  return id.length > 8 ? `${id.slice(0, 4)}...${id.slice(-4)}` : id
}

function getInitial(name?: string) {
  return (name || '?').charAt(0).toUpperCase()
}

onMounted(() => {
  if (!hasLoaded.value) {
    fetchMeetings()
    hasLoaded.value = true
  }
})

onActivated(() => {
  // 保留缓存，避免每次切回历史页都闪烁。
})
</script>

<style scoped>
.history-page {
  min-height: 100vh;
  padding: var(--spacing-xl);
  background: var(--color-bg-light);
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.page-eyebrow {
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--color-accent);
  font-weight: 700;
  text-transform: uppercase;
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
}

.page-summary {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.tab-filter {
  display: flex;
  gap: var(--spacing-sm);
  width: fit-content;
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-xs);
  background: var(--color-bg-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.tab-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  color: var(--color-text-primary);
}

.tab-btn.active {
  background: var(--color-primary);
  color: var(--color-text-white);
}

.meeting-list {
  max-width: 1040px;
}

.loading-state,
.meeting-cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.skeleton-card {
  height: 168px;
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, var(--color-bg-white) 25%, var(--color-border-light) 50%, var(--color-bg-white) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  min-height: 320px;
  color: var(--color-text-muted);
}

.meeting-card {
  padding: var(--spacing-lg);
  background: var(--color-bg-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}

.meeting-card:hover,
.meeting-card:focus-visible {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.card-header,
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.title-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.meeting-name {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
}

.meeting-no,
.creator,
.join-type {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.status-badge {
  flex: 0 0 auto;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.status-badge.ongoing {
  background: rgba(20, 184, 166, 0.12);
  color: var(--color-accent);
}

.status-badge.ended {
  background: rgba(64, 64, 64, 0.08);
  color: var(--color-text-muted);
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--spacing-md);
  margin: var(--spacing-lg) 0;
}

.meta-item {
  padding: var(--spacing-md);
  background: var(--color-bg-light);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
}

.meta-label,
.detail-row span,
.member-item span {
  display: block;
  margin-bottom: var(--spacing-xs);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.meta-item strong,
.detail-row strong {
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: var(--spacing-lg);
}

.detail-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.detail-heading h2 {
  margin: var(--spacing-sm) 0 var(--spacing-xs);
  font-size: var(--font-size-xl);
}

.detail-heading p {
  color: var(--color-text-muted);
}

.detail-section {
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.detail-section h3 {
  margin-bottom: var(--spacing-md);
  font-size: var(--font-size-md);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border-light);
}

.detail-row:last-child {
  border-bottom: none;
}

.member-loading,
.member-empty {
  color: var(--color-text-muted);
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.member-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.member-avatar {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: rgba(20, 184, 166, 0.12);
  color: var(--color-accent);
  font-weight: 700;
}

.detail-action {
  width: 100%;
}

@media (max-width: 1100px) {
  .meta-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
