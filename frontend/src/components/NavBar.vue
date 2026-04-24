<template>
  <div class="nav-bar">
    <div class="logo">EasyMeeting</div>
    <div class="user-info">
      <span class="nick-name">{{ userStore.nickName }}</span>
      <el-button type="text" @click="handleLogout">退出登录</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

function handleLogout() {
  userStore.logout()
}
</script>

<style scoped>
.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  background: #409eff;
  color: #fff;
}
.logo {
  font-size: 20px;
  font-weight: bold;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}
.nick-name {
  font-size: 14px;
}
.user-info :deep(.el-button) {
  color: #fff;
}
</style>
