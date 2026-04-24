<template>
  <AppShell>
    <div class="schedule-page">
      <div class="page-header">
        <div>
          <p class="page-eyebrow">Scheduled meetings</p>
          <h1 class="page-title">预定会议</h1>
        </div>
        <el-button class="create-btn" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          新建预约
        </el-button>
      </div>

      <!-- 会议列表 -->
      <div class="reserve-list">
        <div v-if="loading" class="loading-state">
          <div class="skeleton-card" v-for="i in 3" :key="i"></div>
        </div>

        <div v-else-if="reserves.length === 0" class="empty-state">
          <el-icon :size="48"><Calendar /></el-icon>
          <p>暂无预约会议</p>
          <el-button @click="showCreateDialog">创建第一个预约</el-button>
        </div>

        <div v-else class="reserve-cards">
          <div 
            v-for="reserve in reserves" 
            :key="reserve.meetingId" 
            class="reserve-card"
            tabindex="0"
            @click="openReserveDetail(reserve)"
            @keydown.enter="openReserveDetail(reserve)"
          >
            <div class="card-header">
              <div class="title-block">
                <span class="meeting-name">{{ reserve.meetingName }}</span>
                <span class="meeting-id">预约 ID {{ shortId(reserve.meetingId) }}</span>
              </div>
              <span class="status-badge" :class="getStatusClass(reserve)">
                {{ getStatusText(reserve) }}
              </span>
            </div>

            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">开始时间</span>
                <strong>{{ formatDateTime(reserve.startTime) }}</strong>
              </div>
              <div class="meta-item">
                <span class="meta-label">预计结束</span>
                <strong>{{ formatDateTime(getExpectedEndTime(reserve)) }}</strong>
              </div>
              <div class="meta-item">
                <span class="meta-label">会议时长</span>
                <strong>{{ reserve.duration }} 分钟</strong>
              </div>
              <div class="meta-item">
                <span class="meta-label">加入方式</span>
                <strong>{{ reserve.joinPassword ? '需要密码' : '无需密码' }}</strong>
              </div>
            </div>

            <div class="card-actions">
              <span class="created-at">创建于 {{ formatDateTime(reserve.createTime) }}</span>
              <template v-if="reserve.realMeetingId">
                <el-button type="primary" size="small" @click.stop="joinMeetingAction(reserve)">
                  加入会议
                </el-button>
              </template>
              <template v-else>
                <el-button type="primary" size="small" @click.stop="startMeeting(reserve)">
                  开始会议
                </el-button>
              </template>
              <el-button size="small" @click.stop="deleteReserve(reserve)">
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <el-drawer v-model="detailVisible" title="预约详情" direction="rtl" size="420px">
        <div v-if="selectedReserve" class="detail-panel">
          <div class="detail-heading">
            <span class="status-badge" :class="getStatusClass(selectedReserve)">
              {{ getStatusText(selectedReserve) }}
            </span>
            <h2>{{ selectedReserve.meetingName }}</h2>
            <p>预约 ID {{ selectedReserve.meetingId }}</p>
          </div>

          <div class="detail-section">
            <h3>时间</h3>
            <div class="detail-row">
              <span>开始时间</span>
              <strong>{{ formatFullDateTime(selectedReserve.startTime) }}</strong>
            </div>
            <div class="detail-row">
              <span>预计结束</span>
              <strong>{{ formatFullDateTime(getExpectedEndTime(selectedReserve)) }}</strong>
            </div>
            <div class="detail-row">
              <span>会议时长</span>
              <strong>{{ selectedReserve.duration }} 分钟</strong>
            </div>
            <div class="detail-row">
              <span>创建时间</span>
              <strong>{{ formatFullDateTime(selectedReserve.createTime) }}</strong>
            </div>
          </div>

          <div class="detail-section">
            <h3>会议信息</h3>
            <div class="detail-row">
              <span>创建者</span>
              <strong>{{ selectedReserve.createUserId }}</strong>
            </div>
            <div class="detail-row">
              <span>加入方式</span>
              <strong>{{ selectedReserve.joinPassword ? '需要密码' : '无需密码' }}</strong>
            </div>
            <div class="detail-row">
              <span>真实会议 ID</span>
              <strong>{{ selectedReserve.realMeetingId || '尚未开始' }}</strong>
            </div>
          </div>

          <div class="detail-actions">
            <el-button
              v-if="selectedReserve.realMeetingId"
              type="primary"
              @click="joinMeetingAction(selectedReserve)"
            >
              加入会议
            </el-button>
            <el-button
              v-else
              type="primary"
              @click="startMeeting(selectedReserve)"
            >
              开始会议
            </el-button>
            <el-button @click="deleteReserve(selectedReserve)">删除预约</el-button>
          </div>
        </div>
      </el-drawer>

      <!-- 创建预约对话框 -->
      <el-dialog 
        v-model="createDialogVisible" 
        title="新建预约会议" 
        width="480px"
        :close-on-click-modal="false"
      >
        <el-form 
          ref="formRef" 
          :model="createForm" 
          :rules="formRules" 
          label-width="100px"
        >
          <el-form-item label="会议主题" prop="meetingName">
            <el-input 
              v-model="createForm.meetingName" 
              placeholder="请输入会议主题"
              maxlength="100"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="开始时间" prop="startTime">
            <el-date-picker
              v-model="createForm.startTime"
              type="datetime"
              placeholder="选择开始时间"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm:ss"
              :disabled-date="disabledDate"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="会议时长" prop="duration">
            <el-select v-model="createForm.duration" style="width: 100%">
              <el-option label="30 分钟" :value="30" />
              <el-option label="60 分钟" :value="60" />
              <el-option label="90 分钟" :value="90" />
              <el-option label="120 分钟" :value="120" />
            </el-select>
          </el-form-item>
          <el-form-item label="会议密码">
            <el-input 
              v-model="createForm.joinPassword" 
              placeholder="可选，最多5位"
              maxlength="5"
              show-password
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="createDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="creating" @click="handleCreate">
            创建
          </el-button>
        </template>
      </el-dialog>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Calendar } from '@element-plus/icons-vue'
import AppShell from '@/components/AppShell.vue'
import { 
  loadMeetingReserve, 
  createMeetingReserve, 
  delMeetingReserve,
  startReserveMeeting,
  joinReserveMeeting,
  type MeetingReserve 
} from '@/api/reserve'
import { joinMeeting } from '@/api/meeting'

// 组件名称，用于 keep-alive
defineOptions({
  name: 'Schedule'
})

const router = useRouter()

const loading = ref(false)
const reserves = ref<MeetingReserve[]>([])
const selectedReserve = ref<MeetingReserve | null>(null)
const detailVisible = ref(false)

const createDialogVisible = ref(false)
const creating = ref(false)
const formRef = ref<FormInstance>()

const createForm = reactive({
  meetingName: '',
  startTime: '',
  duration: 60,
  joinPassword: ''
})

const formRules: FormRules = {
  meetingName: [
    { required: true, message: '请输入会议主题', trigger: 'blur' }
  ],
  startTime: [
    { required: true, message: '请选择开始时间', trigger: 'change' }
  ]
}

// 加载预约列表
async function loadReserves() {
  loading.value = true
  try {
    reserves.value = await loadMeetingReserve()
  } catch (error) {
    console.error('加载预约会议失败:', error)
  } finally {
    loading.value = false
  }
}

// 显示创建对话框
function showCreateDialog() {
  createForm.meetingName = ''
  createForm.startTime = ''
  createForm.duration = 60
  createForm.joinPassword = ''
  createDialogVisible.value = true
}

function openReserveDetail(reserve: MeetingReserve) {
  selectedReserve.value = reserve
  detailVisible.value = true
}

// 禁用过去的日期
function disabledDate(date: Date) {
  return date.getTime() < Date.now() - 24 * 60 * 60 * 1000
}

// 创建预约
async function handleCreate() {
  if (!formRef.value) return
  await formRef.value.validate()

  creating.value = true
  try {
    await createMeetingReserve({
      meetingName: createForm.meetingName,
      startTime: createForm.startTime,
      duration: createForm.duration,
      joinPassword: createForm.joinPassword || undefined,
      joinType: createForm.joinPassword ? 1 : 0
    })
    ElMessage.success('预约创建成功')
    createDialogVisible.value = false
    loadReserves()
  } catch (error) {
    console.error('创建预约失败:', error)
  } finally {
    creating.value = false
  }
}

// 开始会议
async function startMeeting(reserve: MeetingReserve) {
  try {
    const realMeetingId = await startReserveMeeting(reserve.meetingId)
    await joinMeeting({ videoOpen: true })
    router.push(`/meeting/${realMeetingId}`)
  } catch (error) {
    console.error('开始会议失败:', error)
  }
}

// 加入会议
async function joinMeetingAction(reserve: MeetingReserve) {
  if (!reserve.realMeetingId) {
    ElMessage.warning('会议尚未开始')
    return
  }
  try {
    await joinReserveMeeting(reserve.meetingId)
    await joinMeeting({ videoOpen: true })
    router.push(`/meeting/${reserve.realMeetingId}`)
  } catch (error) {
    console.error('加入会议失败:', error)
  }
}

// 删除预约
async function deleteReserve(reserve: MeetingReserve) {
  try {
    await ElMessageBox.confirm('确定要删除这个预约会议吗？', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await delMeetingReserve(reserve.meetingId)
    ElMessage.success('删除成功')
    loadReserves()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除预约失败:', error)
    }
  }
}

// 格式化日期时间
function formatDateTime(dateStr: string) {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '--'
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hours}:${minutes}`
}

function formatFullDateTime(dateStr: string) {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '--'
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function getExpectedEndTime(reserve: MeetingReserve) {
  const date = new Date(reserve.startTime)
  if (Number.isNaN(date.getTime())) return reserve.startTime
  date.setMinutes(date.getMinutes() + reserve.duration)
  return date.toISOString()
}

function shortId(id?: string) {
  if (!id) return '--'
  return id.length > 8 ? `${id.slice(0, 4)}...${id.slice(-4)}` : id
}

// 获取状态样式
function getStatusClass(reserve: MeetingReserve) {
  if (reserve.realMeetingId) return 'started'
  return 'pending'
}

// 获取状态文本
function getStatusText(reserve: MeetingReserve) {
  if (reserve.realMeetingId) return '进行中'
  return '待开始'
}

// 是否已加载过数据
const hasLoaded = ref(false)

onMounted(() => {
  if (!hasLoaded.value) {
    loadReserves()
    hasLoaded.value = true
  }
})

// 当从 keep-alive 缓存中激活时刷新数据
onActivated(() => {
  if (hasLoaded.value) {
    loadReserves()
  }
})
</script>

<style scoped>
.schedule-page {
  padding: var(--spacing-xl);
  min-height: 100vh;
  background: var(--color-bg-light);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.page-eyebrow {
  margin-bottom: var(--spacing-xs);
  color: var(--color-accent);
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-transform: uppercase;
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
}

.create-btn {
  background: var(--color-primary);
  border: none;
  color: var(--color-text-white);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: background var(--transition-fast);
}

.create-btn:hover {
  background: var(--color-secondary);
}

.reserve-list {
  max-width: 1040px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.skeleton-card {
  height: 168px;
  background: linear-gradient(90deg, var(--color-bg-light) 25%, var(--color-border-light) 50%, var(--color-bg-light) 75%);
  background-size: 200% 100%;
  border-radius: var(--radius-lg);
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
  padding: var(--spacing-2xl);
  color: var(--color-text-muted);
  gap: var(--spacing-md);
}

.empty-state .el-icon {
  color: var(--color-border);
}

.reserve-cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.reserve-card {
  background: var(--color-bg-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  cursor: pointer;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}

.reserve-card:hover,
.reserve-card:focus-visible {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.meeting-id,
.created-at {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.status-badge {
  font-size: var(--font-size-xs);
  font-weight: 700;
  padding: 3px 10px;
  border-radius: var(--radius-full);
}

.status-badge.pending {
  background: rgba(64, 64, 64, 0.1);
  color: var(--color-text-secondary);
}

.status-badge.started {
  background: rgba(20, 184, 166, 0.12);
  color: var(--color-accent);
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
.detail-row span {
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

.card-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.created-at {
  margin-right: auto;
}

.card-actions .el-button--primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.card-actions .el-button--primary:hover {
  background: var(--color-secondary);
  border-color: var(--color-secondary);
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
  overflow-wrap: anywhere;
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

.detail-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.detail-actions .el-button {
  flex: 1;
}

/* Dialog overrides */
:deep(.el-dialog) {
  border-radius: var(--radius-lg);
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--spacing-md);
}

:deep(.el-dialog__title) {
  font-weight: 600;
  color: var(--color-text-primary);
}

@media (max-width: 1100px) {
  .meta-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
