<template>
  <nav class="side-nav">
    <div class="nav-top">
      <!-- Logo -->
      <div class="nav-logo">
        <span class="logo-text">E</span>
      </div>
      
      <!-- Navigation Items -->
      <div class="nav-items">
        <div
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ active: activeKey === item.key }"
          @click="handleNavClick(item)"
          :title="item.label"
        >
          <component :is="item.icon" class="nav-icon" />
          <!-- 通讯录未读消息红点 -->
          <span v-if="item.key === 'contacts' && hasContactUnread" class="unread-dot"></span>
          <span class="nav-tooltip">{{ item.label }}</span>
        </div>
      </div>
    </div>
    
    <!-- Bottom Section -->
    <div class="nav-bottom">
      <div class="user-avatar" @click="handleUserClick" :title="userName">
        <span>{{ userInitial }}</span>
      </div>

      <!-- Logout Button -->
      <div class="nav-item logout-btn" @click="handleLogout" title="退出登录">
        <SwitchButton class="nav-icon" />
        <span class="nav-tooltip">退出登录</span>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { VideoCamera, User, FolderOpened, Setting, SwitchButton } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const chatStore = useChatStore()

const navItems = [
  { key: 'meeting', label: '会议', icon: VideoCamera, path: '/' },
  { key: 'contacts', label: '通讯录', icon: User, path: '/contacts' },
  { key: 'recordings', label: '录制', icon: FolderOpened, path: '/recordings' },
  { key: 'settings', label: '设置', icon: Setting, path: '/settings' }
]

const activeKey = computed(() => {
  const path = route.path
  if (path === '/' || path.startsWith('/meeting')) return 'meeting'
  if (path.startsWith('/contacts')) return 'contacts'
  if (path.startsWith('/recordings')) return 'recordings'
  if (path.startsWith('/settings')) return 'settings'
  return 'meeting'
})

// 通讯录是否有未读消息
const hasContactUnread = computed(() => chatStore.hasUnread)

const userName = computed(() => userStore.nickName || '用户')
const userInitial = computed(() => userName.value.charAt(0).toUpperCase())

function handleNavClick(item: typeof navItems[0]) {
  router.push(item.path)
}

function handleUserClick() {
}

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '退出确认', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning'
    })
    // 使用 store 的 logout 方法
    userStore.logout()
  } catch {
    // 用户取消
  }
}
</script>

<style scoped>
.side-nav {
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--color-bg-dark);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--spacing-md) 0;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
}

.nav-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);
}

.nav-logo {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--color-accent), #0f766e);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-md);
  box-shadow: 0 8px 22px rgba(20, 184, 166, 0.28);
}

.logo-text {
  color: var(--color-text-white);
  font-size: var(--font-size-lg);
  font-weight: 700;
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.nav-item {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  cursor: pointer;
  position: relative;
  transition: background var(--transition-fast);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.nav-item.active {
  background: rgba(20, 184, 166, 0.16);
}

.nav-icon {
  width: 22px;
  height: 22px;
  color: var(--color-text-light);
  transition: color var(--transition-fast);
}

.nav-item:hover .nav-icon,
.nav-item.active .nav-icon {
  color: var(--color-accent);
}

.nav-tooltip {
  position: absolute;
  left: calc(100% + 12px);
  background: var(--color-primary);
  color: var(--color-text-white);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--transition-fast), visibility var(--transition-fast);
  pointer-events: none;
}

/* 未读消息红点 */
.unread-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: #f56c6c;
  border-radius: 50%;
  border: 2px solid var(--color-bg-dark);
}

.nav-item:hover .nav-tooltip {
  opacity: 1;
  visibility: visible;
}

.nav-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.logout-btn {
  width: 44px;
  height: 44px;
}

.logout-btn:hover .nav-icon {
  color: #dc3545;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: rgba(20, 184, 166, 0.12);
  border: 1px solid rgba(20, 184, 166, 0.32);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
}

.user-avatar:hover {
  background: rgba(20, 184, 166, 0.22);
  border-color: var(--color-accent);
  transform: translateY(-1px);
}

.user-avatar span {
  color: var(--color-accent);
  font-size: var(--font-size-sm);
  font-weight: 700;
}
</style>
