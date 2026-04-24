<template>
  <div class="register-page">
    <div class="register-card">
      <!-- Logo -->
      <div class="register-logo">
        <span class="logo-mark">E</span>
        <span class="logo-text">EasyMeeting</span>
      </div>
      
      <!-- Form -->
      <el-form ref="formRef" :model="form" :rules="rules" class="register-form">
        <el-form-item prop="email">
          <el-input 
            v-model="form.email" 
            placeholder="邮箱" 
            size="large"
            :prefix-icon="Message"
          />
        </el-form-item>
        
        <el-form-item prop="nickName">
          <el-input 
            v-model="form.nickName" 
            placeholder="昵称" 
            size="large"
            :prefix-icon="User"
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
        
        <el-form-item prop="confirmPassword">
          <el-input 
            v-model="form.confirmPassword" 
            type="password" 
            placeholder="确认密码" 
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
            class="register-btn" 
            :loading="loading" 
            @click="handleRegister"
          >
            注册
          </el-button>
        </el-form-item>
      </el-form>
      
      <!-- Footer -->
      <div class="register-footer">
        <span>已有账号？</span>
        <router-link to="/login" class="login-link">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { Message, User, Lock } from '@element-plus/icons-vue'
import CheckCode from '@/components/CheckCode.vue'
import { register } from '@/api/account'

const router = useRouter()
const formRef = ref<FormInstance>()
const checkCodeRef = ref<InstanceType<typeof CheckCode>>()
const loading = ref(false)

const form = reactive({
  email: '',
  nickName: '',
  password: '',
  confirmPassword: '',
  checkCode: ''
})

const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  nickName: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { max: 20, message: '昵称最长20个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { max: 20, message: '密码最长20个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ],
  checkCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' }
  ]
}

async function handleRegister() {
  if (!formRef.value) return
  await formRef.value.validate()
  
  loading.value = true
  try {
    await register({
      email: form.email,
      nickName: form.nickName,
      password: form.password,
      checkCode: form.checkCode,
      checkCodeKey: checkCodeRef.value?.checkCodeKey || ''
    })
    ElMessage.success('注册成功，请登录')
    router.push('/login')
  } catch {
    checkCodeRef.value?.refresh()
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-light);
}

.register-card {
  width: 400px;
  padding: var(--spacing-2xl);
  background: var(--color-bg-white);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}

.register-logo {
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

.register-form {
  margin-bottom: var(--spacing-md);
}

.register-form :deep(.el-input__wrapper) {
  border-radius: var(--radius-md);
  box-shadow: 0 0 0 1px var(--color-border) inset;
}

.register-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--color-secondary) inset;
}

.register-form :deep(.el-input__wrapper.is-focus) {
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

.register-btn {
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

.register-btn:hover {
  background: var(--color-secondary);
}

.register-footer {
  text-align: center;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.login-link {
  color: var(--color-accent);
  font-weight: 500;
  margin-left: var(--spacing-xs);
  transition: color var(--transition-fast);
}

.login-link:hover {
  color: var(--color-primary);
}
</style>
