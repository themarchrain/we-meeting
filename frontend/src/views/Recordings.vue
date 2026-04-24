<template>
  <AppShell>
    <div class="recordings-page">
      <div class="placeholder-panel">
        <div class="placeholder-icon">
          <el-icon :size="34"><FolderOpened /></el-icon>
        </div>
        <div>
          <p class="page-eyebrow">Recordings</p>
          <h1>会议录制</h1>
          <p class="description">
            录制功能尚未开放。当前页面用于承接导航入口，后续可在这里展示云端录制、文件状态和下载入口。
          </p>
        </div>
      </div>

      <div class="roadmap-grid">
        <div class="roadmap-item">
          <span>01</span>
          <strong>录制任务</strong>
          <p>记录会议号、发起人、开始时间和处理状态。</p>
        </div>
        <div class="roadmap-item">
          <span>02</span>
          <strong>文件管理</strong>
          <p>展示录制文件大小、格式、下载和删除操作。</p>
        </div>
        <div class="roadmap-item">
          <span>03</span>
          <strong>权限控制</strong>
          <p>限制主持人和参会者对录制内容的访问范围。</p>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { FolderOpened } from '@element-plus/icons-vue'
import AppShell from '@/components/AppShell.vue'
</script>

<style scoped>
.recordings-page {
  min-height: 100vh;
  padding: var(--spacing-xl);
  background: var(--color-bg-light);
}

.placeholder-panel {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  max-width: 780px;
  padding: var(--spacing-xl);
  background: var(--color-bg-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.placeholder-icon {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: var(--radius-md);
  background: rgba(20, 184, 166, 0.1);
  color: var(--color-accent);
}

.page-eyebrow {
  margin-bottom: var(--spacing-xs);
  color: var(--color-accent);
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-transform: uppercase;
}

.description {
  margin-top: var(--spacing-sm);
  color: var(--color-text-muted);
  max-width: 560px;
}

.roadmap-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-md);
  max-width: 980px;
  margin-top: var(--spacing-lg);
}

.roadmap-item {
  padding: var(--spacing-lg);
  background: var(--color-bg-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.roadmap-item span {
  display: inline-flex;
  margin-bottom: var(--spacing-md);
  color: var(--color-accent);
  font-weight: 700;
}

.roadmap-item strong,
.roadmap-item p {
  display: block;
}

.roadmap-item p {
  margin-top: var(--spacing-xs);
  color: var(--color-text-muted);
}
</style>
