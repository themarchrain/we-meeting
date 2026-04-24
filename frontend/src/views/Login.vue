<template>
  <div class="login-page">
    <div class="login-card">
      <!-- Logo -->
      <div class="login-logo">
        <span class="logo-mark">E</span>
        <span class="logo-text">EasyMeeting</span>
      </div>
      
      <!-- Form -->
      <el-form ref="formRef" :model="form" :rules="rules" class="login-form">
        <el-form-item prop="email">
          <el-input 
            v-model="form.email" 
            placeholder="邮箱" 
            size="large"
            :prefix-icon="Message"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="密码" 
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item prop="checkCode">
          <div class="check-code-row">
            <el-input 
              v-model="form.checkCode" 
              placeholder="验证码" 
              size="large"
            />
            <CheckCode ref="checkCodeRef" />
          </div>
        </el-form-item>
        
        <el-form-item>
          <el-button 
            class="login-btn" 
            :loading="loading" 
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
      
      <!-- Footer -->
      <div class="login-footer">
        <span>还没有账号？</span>
        <router-link to="/register" class="register-link">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Message, Lock } from '@element-plus/icons-vue'
import CheckCode from '@/components/CheckCode.vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const formRef = ref<FormInstance>()
const checkCodeRef = ref<InstanceType<typeof CheckCode>>()
const loading = ref(false)

const form = reactive({
  email: '',
  password: '',
  checkCode: ''
})

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ],
  checkCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' }
  ]
}

async function handleLogin() {
  if (!formRef.value) return
  await formRef.value.validate()
  
  loading.value = true
  try {
    await userStore.login(
      form.email,
      form.password,
      form.checkCode,
      checkCodeRef.value?.checkCodeKey || ''
    )
    ElMessage.success('登录成功')
  } catch {
    checkCodeRef.value?.refresh()
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-light);
}

.login-card {
  width: 400px;
  padding: var(--spacing-2xl);
  background: var(--color-bg-white);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}

.login-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-2xl);
}

.logo-mark {
  width: 40px;
  height: 40px;
  background: var(--color-primary);
  color: var(--color-text-white);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xl);
  font-weight: 700;
}

.logo-text {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.login-form {
  margin-bottom: var(--spacing-md);
}

.login-form :deep(.el-input__wrapper) {
  border-radius: var(--radius-md);
  box-shadow: 0 0 0 1px var(--color-border) inset;
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--color-secondary) inset;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--color-primary) inset;
}

.check-code-row {
  display: flex;
  gap: var(--spacing-sm);
  width: 100%;
}

.check-code-row .el-input {
  flex: 1;
}

.login-btn {
  width: 100%;
  height: 44px;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text-white);
  font-size: var(--font-size-md);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.login-btn:hover {
  background: var(--color-secondary);
}

.login-footer {
  text-align: center;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.register-link {
  color: var(--color-accent);
  font-weight: 500;
  margin-left: var(--spacing-xs);
  transition: color var(--transition-fast);
}

.register-link:hover {
  color: var(--color-primary);
}
</style>
