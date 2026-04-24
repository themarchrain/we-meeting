// 邮箱格式验证
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 字符串长度验证
export function validateLength(str: string, max: number): boolean {
  return str.length <= max
}

// 密码确认匹配验证
export function validatePasswordMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword
}
