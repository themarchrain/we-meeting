<template>
  <div class="check-code" @click="refresh">
    <img v-if="checkCodeImg" :src="checkCodeImg" alt="验证码" />
    <span v-else class="loading">加载中...</span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCheckCode } from '@/api/account'

const checkCodeImg = ref('')
const checkCodeKey = ref('')

async function refresh() {
  try {
    const res = await getCheckCode()
    checkCodeImg.value = res.checkCode
    checkCodeKey.value = res.checkCodeKey
  } catch {
    // 错误已在拦截器中处理
  }
}

onMounted(() => {
  refresh()
})

defineExpose({
  checkCodeKey,
  refresh
})
</script>

<style scoped>
.check-code {
  cursor: pointer;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.check-code img {
  height: 42px;
  border-radius: 4px;
}
.loading {
  color: #999;
  font-size: 12px;
}
</style>
