// 通用响应结构
export interface ResponseVO<T> {
  code: number
  message: string
  data: T
  timestamp: number
}

// 验证码
export interface CheckCodeVo {
  checkCode: string
  checkCodeKey: string
}

// 用户信息
export interface UserInfoVo {
  userId: string
  nickName: string
  sex: number
  meetingNo: string
  token: string
  isAdmin: boolean
}

// 会议信息
export interface MeetingInfo {
  meetingId: string
  meetingNo: string
  meetingName: string
  createTime: string
  createUserId: string
  joinType: number
  joinPassword?: string
  startTime: string
  endTime: string
  status: number
}

// 分页结果
export interface PageResult<T> {
  pageNo: number
  pageSize: number
  total: number
  list: T[]
}

// 分页参数
export interface PageParams {
  pageNo?: number
  pageSize?: number
}

// 注册参数
export interface RegisterDTO {
  email: string
  nickName: string
  password: string
  checkCode: string
  checkCodeKey: string
}

// 登录参数
export interface LoginDTO {
  email: string
  password: string
  checkCode: string
  checkCodeKey: string
}

// 创建会议参数
export interface MeetingCreateParams {
  meetingNoType: number    // 0=个人会议号, 1=系统生成
  meetingName: string      // 会议主题
  joinType: number         // 加入类型
  joinPassword?: string    // 会议密码（可选，最多5位）
}

// 预加入会议参数
export interface PreJoinMeetingParams {
  meetingNo: string        // 会议号
  nickName: string         // 昵称
  password?: string        // 会议密码（可选）
}

// 加入会议参数
export interface JoinMeetingParams {
  videoOpen: boolean       // 是否开启摄像头
}

// 快速会议表单
export interface QuickMeetingForm {
  meetingNoType: number
  meetingName: string
  joinType: number
  joinPassword: string
}

// 加入会议表单
export interface JoinMeetingForm {
  meetingNo: string
  nickName: string
  joinPassword: string
  videoOpen: boolean
}


// 会议成员信息（WebSocket）
export interface MeetingMemberDto {
  userId: string
  nickName: string
  joinTime: number
  memberType: number
  status: number
  videoOpen: boolean
  sex: number
}

// 历史会议成员记录
export interface MeetingMemberRecord {
  meetingId: string
  userId: string
  nickName: string
  lastJoinTime: string
  status: number
  memberType: number
  meetingStatus: number
}

// 加入会议消息内容
export interface MeetingJoinContent {
  newMember: MeetingMemberDto
  meetingMemberList: MeetingMemberDto[]
}

// 退出会议消息内容
export interface MeetingExitContent {
  exitUserId: string
  exitStatus: number  // 0=正常退出, 1=踢出, 2=拉黑
  meetingMemberList: MeetingMemberDto[]
}

// 强制退出消息内容（被踢出/拉黑）
export interface ForceExitContent {
  exitUserId: string
  exitStatus: number  // 1=踢出, 2=拉黑
  meetingMemberList: MeetingMemberDto[]
}

// 会议成员状态枚举
export enum MeetingMemberStatus {
  NORMAL = 0,      // 正常
  KICK_OUT = 1,    // 被踢出
  BLACKLIST = 2    // 被拉黑
}

// 会议成员类型枚举
export enum MemberType {
  CREATOR = 0,     // 创建者/主持人
  NORMAL = 1       // 普通成员
}

// 会议状态枚举
export enum MeetingStatus {
  RUNNING = 0,     // 进行中
  FINISHED = 1     // 已结束
}

// WebSocket 消息结构
export interface WebSocketMessage<T = any> {
  messageSendToType: number
  meetingId?: string
  messageType: number
  sendUserId?: string
  sendUserNickName?: string
  messageContent?: T
  receiveUserId?: string
  sendTime?: number
  messageId?: number
  status?: number
  fileName?: string
  fileType?: number
  fileSize?: number
}


// 联系人相关类型
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

export interface UserContactApplyVo {
  applyId: number
  applyUserId: string
  applyUserNickName: string
  receiveUserId: string
  receiveUserNickName: string
  lastApplyTime: string
  status: number
}

export interface UserInfoVoForSearch {
  userId: string
  nickName: string
  status: number
}

// 联系人搜索状态枚举
export enum ContactSearchStatus {
  SELF = -1,
  NOT_FRIEND = 0,
  FRIEND = 1,
  PENDING = 2,
  BLACKLISTED = 3,
  BE_FRIEND = 4
}

// 好友申请状态枚举
export enum ApplyStatus {
  INIT = 0,
  PASS = 1,
  REJECT = 2,
  BLACKLIST = 3
}

// 会议邀请消息内容
export interface MeetingInviteContent {
  meetingId: string
  meetingName: string
  inviteUserName: string
}

// 聊天消息类型
export interface ChatMessage {
  messageId: number
  meetingId: string
  sendUserId: string
  sendUserNickName: string
  receiveUserId: string
  receiveType: number  // 0-群发, 1-私聊
  messageType: number  // 5-文本, 6-媒体
  messageContent: string
  fileName?: string
  fileSize?: number
  fileType?: number
  sendTime: number
  status: number
}

// 私聊消息类型
export interface PrivateChatMessage {
  messageId: number
  sessionId: string
  sendUserId: string
  sendUserNickName: string
  receiveUserId: string
  messageType: number
  messageContent: string
  fileName?: string
  fileSize?: number
  fileType?: number
  sendTime: number
  status: number
}

// 未读消息记录
export interface PrivateChatUnread {
  id: number
  userId: string
  contactId: string
  unreadCount: number
  lastMessageContent: string
  lastMessageTime: number
}

// 消息类型枚举
export enum MessageTypeEnum {
  CHAT_TEXT_MESSAGE = 5,
  CHAT_MEDIA_MESSAGE = 6
}

// 接收类型枚举
export enum ReceiveTypeEnum {
  ALL = 0,      // 群发
  USER = 1      // 私聊
}
