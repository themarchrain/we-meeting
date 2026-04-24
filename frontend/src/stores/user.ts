import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, logout as logoutApi } from '@/api/account'
import { encryptMD5 } from '@/utils/md5'
import type { UserInfoVo, LoginDTO } from '@/types'
import router from '@/router'

export const useUserStore = defineStore('user', () => {
  const userId = ref('')
  const nickName = ref('')
  const sex = ref(0)
  const meetingNo = ref('')
  const token = ref('')
  const isAdmin = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  // 登录
  async function login(email: string, password: string, checkCode: string, checkCodeKey: string) {
    const params: LoginDTO = {
      email,
      password: encryptMD5(password),
      checkCode,
      checkCodeKey
    }
    const userInfo = await loginApi(params)
    setUserInfo(userInfo)
    router.push('/')
  }

  // 设置用户信息
  function setUserInfo(userInfo: UserInfoVo) {
    userId.value = userInfo.userId
    nickName.value = userInfo.nickName
    sex.value = userInfo.sex
    meetingNo.value = userInfo.meetingNo
    token.value = userInfo.token
    isAdmin.value = userInfo.isAdmin
    // 持久化到 localStorage
    localStorage.setItem('token', userInfo.token)
    localStorage.setItem('userInfo', JSON.stringify(userInfo))
  }

  // 从 localStorage 恢复状态
  function restoreFromStorage() {
    const savedToken = localStorage.getItem('token')
    const savedUserInfo = localStorage.getItem('userInfo')
    if (savedToken && savedUserInfo) {
      try {
        const userInfo = JSON.parse(savedUserInfo) as UserInfoVo
        userId.value = userInfo.userId
        nickName.value = userInfo.nickName
        sex.value = userInfo.sex
        meetingNo.value = userInfo.meetingNo
        token.value = userInfo.token
        isAdmin.value = userInfo.isAdmin
      } catch {
        logout()
      }
    }
  }

  // 退出登录
  async function logout() {
    // 调用后端接口
    try {
      await logoutApi()
    } catch (error) {
      console.error('退出登录接口调用失败:', error)
    }
    // 无论接口调用成功与否，都执行清除本地存储的逻辑
    userId.value = ''
    nickName.value = ''
    sex.value = 0
    meetingNo.value = ''
    token.value = ''
    isAdmin.value = false
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    router.push('/login')
  }

  return {
    userId,
    nickName,
    sex,
    meetingNo,
    token,
    isAdmin,
    isLoggedIn,
    login,
    logout,
    restoreFromStorage
  }
})
