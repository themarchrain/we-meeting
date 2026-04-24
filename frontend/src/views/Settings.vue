<template>
  <AppShell>
    <div class="settings-page">
      <div class="page-header">
        <p class="page-eyebrow">Preferences</p>
        <h1>设置</h1>
      </div>

      <div class="settings-layout">
        <section class="profile-panel">
          <div class="avatar-large">{{ userInitial }}</div>
          <div>
            <h2>{{ userStore.nickName || '用户' }}</h2>
            <p>{{ userStore.isAdmin ? '管理员账号' : '普通账号' }}</p>
          </div>
        </section>

        <section class="settings-section">
          <h3>账号信息</h3>
          <div class="setting-row">
            <span>用户 ID</span>
            <strong>{{ userStore.userId || '--' }}</strong>
          </div>
          <div class="setting-row">
            <span>昵称</span>
            <strong>{{ userStore.nickName || '--' }}</strong>
          </div>
          <div class="setting-row">
            <span>个人会议号</span>
            <strong>{{ userStore.meetingNo || '--' }}</strong>
          </div>
          <div class="setting-row">
            <span>性别标识</span>
            <strong>{{ getSexText(userStore.sex) }}</strong>
          </div>
        </section>

        <section class="settings-section">
          <h3>会议偏好</h3>
          <div class="preference-item">
            <div>
              <strong>入会默认开启摄像头</strong>
              <span>当前加入会议弹窗会默认开启视频，可在入会前手动关闭。</span>
            </div>
            <el-tag type="success">已启用</el-tag>
          </div>
          <div class="preference-item">
            <div>
              <strong>局域网开发访问</strong>
              <span>摄像头需要 HTTPS 或浏览器信任当前开发地址。</span>
            </div>
            <el-tag>开发期</el-tag>
          </div>
        </section>

      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppShell from '@/components/AppShell.vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const userInitial = computed(() => (userStore.nickName || 'U').charAt(0).toUpperCase())

function getSexText(sex: number) {
  switch (sex) {
    case 1: return '男'
    case 2: return '女'
    default: return '未设置'
  }
}
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  padding: var(--spacing-xl);
  background: var(--color-bg-light);
}

.page-header {
  margin-bottom: var(--spacing-xl);
}

.page-eyebrow {
  margin-bottom: var(--spacing-xs);
  color: var(--color-accent);
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-transform: uppercase;
}

.settings-layout {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(420px, 680px);
  gap: var(--spacing-lg);
  align-items: start;
}

.profile-panel,
.settings-section {
  background: var(--color-bg-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
}

.profile-panel {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.avatar-large {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-text-white);
  font-size: var(--font-size-2xl);
  font-weight: 700;
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
}

.profile-panel h2 {
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-xl);
}

.profile-panel p {
  color: var(--color-text-muted);
}

.settings-section {
  grid-column: 2;
}

.settings-section h3 {
  margin-bottom: var(--spacing-md);
  font-size: var(--font-size-lg);
}

.setting-row {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-md) 0;
  border-bottom: 1px solid var(--color-border-light);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-row span {
  color: var(--color-text-muted);
}

.setting-row strong {
  overflow-wrap: anywhere;
  text-align: right;
}

.preference-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-lg);
  padding: var(--spacing-md) 0;
  border-bottom: 1px solid var(--color-border-light);
}

.preference-item:last-child {
  border-bottom: none;
}

.preference-item strong,
.preference-item span {
  display: block;
}

.preference-item span {
  margin-top: var(--spacing-xs);
  color: var(--color-text-muted);
}

.preference-item :deep(.el-tag) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  line-height: 1;
}

@media (max-width: 1100px) {
  .settings-layout {
    grid-template-columns: 1fr;
  }

  .settings-section {
    grid-column: auto;
  }
}
</style>
