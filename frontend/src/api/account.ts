import request from './index'
import type { CheckCodeVo, UserInfoVo, RegisterDTO, LoginDTO } from '@/types'

// 获取图形验证码
export function getCheckCode(): Promise<CheckCodeVo> {
  return request.get('/account/checkCode')
}

// 用户注册
export function register(params: RegisterDTO): Promise<void> {
  return request.post('/account/register', params)
}

// 用户登录
export function login(params: LoginDTO): Promise<UserInfoVo> {
  return request.post('/account/login', params)
}

// 用户退出登录
export function logout(): Promise<void> {
  return request.post('/account/logout')
}
