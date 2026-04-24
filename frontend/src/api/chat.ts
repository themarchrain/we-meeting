import request from './index'

// 会议聊天消息
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

// 私聊消息
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

// 分页结果
export interface PageResult<T> {
  pageNo: number
  pageSize: number
  total: number
  list: T[]
}

// ==================== 会议聊天 API ====================

/**
 * 加载会议聊天消息（首次加载）
 */
export function loadMeetingMessages(pageNo = 1, pageSize = 20): Promise<PageResult<ChatMessage>> {
  return request.get('/chat/loadMessage', { params: { pageNo, pageSize } })
}

/**
 * 加载更多会议聊天消息（根据 maxMessageId）
 */
export function loadMoreMeetingMessages(maxMessageId: number, pageSize = 20): Promise<PageResult<ChatMessage>> {
  return request.get('/chat/loadMessage', { params: { maxMessageId, pageSize } })
}

/**
 * 发送会议聊天消息
 * @param message 消息内容
 * @param messageType 消息类型（5-文本，6-媒体）
 * @param receiveId 接收者ID（"0"表示群发，其他为私聊目标用户ID）
 */
export function sendMeetingMessage(
  message: string,
  messageType: number,
  receiveId: string,
  fileName?: string,
  fileSize?: number,
  fileType?: number
): Promise<ChatMessage> {
  return request.get('/chat/sendMessage', {
    params: { message, messageType, receiveId, fileName, fileSize, fileType }
  })
}

// ==================== 私聊 API ====================

/**
 * 发送私聊消息
 */
export function sendPrivateMessage(
  contactId: string,
  messageType: number,
  message: string,
  fileName?: string,
  fileSize?: number,
  fileType?: number
): Promise<PrivateChatMessage> {
  return request.post('/private-chat/send', null, {
    params: { contactId, messageType, message, fileName, fileSize, fileType }
  })
}

/**
 * 获取私聊历史消息
 */
export function getPrivateChatHistory(
  contactId: string,
  pageNo = 1,
  pageSize = 20
): Promise<PageResult<PrivateChatMessage>> {
  return request.get('/private-chat/history', { params: { contactId, pageNo, pageSize } })
}

/**
 * 加载更多私聊历史消息
 */
export function getPrivateMessagesBeforeId(
  contactId: string,
  maxMessageId: number,
  pageSize = 20
): Promise<PageResult<PrivateChatMessage>> {
  return request.get('/private-chat/history/before', { params: { contactId, maxMessageId, pageSize } })
}

/**
 * 获取单个会话的未读消息数
 */
export function getUnreadCount(contactId: string): Promise<number> {
  return request.get('/private-chat/unread', { params: { contactId } })
}

/**
 * 获取所有会话的未读消息数
 */
export function getAllUnreadCounts(): Promise<Record<string, number>> {
  return request.get('/private-chat/unread/all')
}

/**
 * 获取未读消息列表
 */
export function getUnreadList(): Promise<PrivateChatUnread[]> {
  return request.get('/private-chat/unread/list')
}

/**
 * 标记消息已读
 */
export function markAsRead(contactId: string): Promise<void> {
  return request.post('/private-chat/read', null, { params: { contactId } })
}
