import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getAllUnreadCounts } from '@/api/chat'

/**
 * 聊天消息状态管理
 * 用于全局管理私聊未读消息计数
 */
export const useChatStore = defineStore('chat', () => {
  // 未读消息计数 Map<contactId, count>
  const unreadCounts = ref<Record<string, number>>({})
  
  // 总未读消息数
  const totalUnreadCount = computed(() => {
    return Object.values(unreadCounts.value).reduce((sum, count) => sum + count, 0)
  })
  
  // 是否有未读消息
  const hasUnread = computed(() => totalUnreadCount.value > 0)
  
  /**
   * 从后端加载所有未读消息计数
   */
  async function loadUnreadCounts() {
    try {
      const result = await getAllUnreadCounts()
      console.log('chatStore: 加载未读消息计数结果:', result)
      unreadCounts.value = result || {}
      console.log('chatStore: 当前未读消息计数:', unreadCounts.value, 'hasUnread:', hasUnread.value)
    } catch (error) {
      console.error('加载未读消息计数失败:', error)
    }
  }
  
  /**
   * 增加指定联系人的未读消息计数
   */
  function incrementUnread(contactId: string) {
    if (unreadCounts.value[contactId]) {
      unreadCounts.value[contactId]++
    } else {
      unreadCounts.value[contactId] = 1
    }
  }
  
  /**
   * 清除指定联系人的未读消息计数
   */
  function clearUnread(contactId: string) {
    if (unreadCounts.value[contactId]) {
      unreadCounts.value[contactId] = 0
    }
  }
  
  /**
   * 获取指定联系人的未读消息计数
   */
  function getUnreadCount(contactId: string): number {
    return unreadCounts.value[contactId] || 0
  }
  
  /**
   * 重置所有未读消息计数
   */
  function resetAll() {
    unreadCounts.value = {}
  }
  
  return {
    unreadCounts,
    totalUnreadCount,
    hasUnread,
    loadUnreadCounts,
    incrementUnread,
    clearUnread,
    getUnreadCount,
    resetAll
  }
})
