import request from './index'

// 联系人信息
export interface UserContactVo {
  userId: string
  contactId: string
  contactNickName: string
  sex: number
  status: number
  lastUpdateTime: string
  lastLoginTime: number | null
  lastOffTime: number | null
  online: boolean
}

// 联系人申请信息
export interface UserContactApplyVo {
  applyId: number
  applyUserId: string
  applyUserNickName: string
  receiveUserId: string
  receiveUserNickName: string
  lastApplyTime: string
  status: number  // 0-待处理，1-已同意，2-已拒绝，3-已拉黑
}

// 搜索联系人结果
export interface UserInfoVoForSearch {
  userId: string
  nickName: string
  status: number  // -1自己, 0非好友, 1好友, 2待处理, 3被拉黑, 4对方已添加我
}

// 搜索状态枚举
export enum ContactSearchStatus {
  SELF = -1,        // 搜索自己
  NOT_FRIEND = 0,   // 非好友，可申请
  FRIEND = 1,       // 已是好友
  PENDING = 2,      // 申请待处理
  BLACKLISTED = 3,  // 被拉黑
  BE_FRIEND = 4     // 对方已添加我，可直接添加
}

// 申请状态枚举
export enum ApplyStatus {
  INIT = 0,       // 待处理
  PASS = 1,       // 已同意
  REJECT = 2,     // 已拒绝
  BLACKLIST = 3   // 已拉黑
}

// 加载联系人列表
export function loadContactUser(): Promise<UserContactVo[]> {
  return request.get('/userContact/loadContactUser')
}

// 加载收到的好友申请列表
export function loadContactApply(): Promise<UserContactApplyVo[]> {
  return request.get('/userContact/loadContactApply')
}

// 搜索联系人
export function searchContact(searchUserId: string): Promise<UserInfoVoForSearch> {
  return request.get('/userContact/searchContact', { params: { searchUserId } })
}

// 发送好友申请
export function applyAddContact(receiverUserId: string): Promise<number> {
  return request.post('/userContact/contactApply', null, { params: { receiverUserId } })
}

// 处理好友申请
export function dealWithApply(applyUserId: string, status: number): Promise<void> {
  return request.post('/userContact/dealWithApply', null, { params: { applyUserId, status } })
}

// 联系人状态枚举
export enum ContactStatus {
  NORMAL = 0,     // 正常
  DEL = 1,        // 删除
  BLACK = 2       // 拉黑
}

// 操作联系人（删除/拉黑）
export function operateContact(contactId: string, status: number): Promise<void> {
  return request.delete('/userContact/operateContact', { params: { contactId, status } })
}
