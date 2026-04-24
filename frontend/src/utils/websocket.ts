import { useUserStore } from '@/stores/user'

// 消息类型枚举（与后端 MessageTypeEnum 对应）
export enum MessageType {
  INIT = 0,                    // 连接ws获取信息
  ADD_MEETING_ROOM = 1,        // 加入房间
  PEER = 2,                    // 发送peer
  EXIT_MEETING_ROOM = 3,       // 退出房间
  FINISH_MEETING = 4,          // 结束会议
  CHAT_TEXT_MESSAGE = 5,       // 文本消息
  CHAT_MEDIA_MESSAGE = 6,      // 媒体消息
  CHAT_MEDIA_MESSAGE_UPDATE = 7, // 媒体消息更新
  USER_CONTACT_APPLY = 8,      // 好友申请消息
  INVITE_MESSAGE_MEETING = 9,  // 邀请入会
  FORCE_OFF_LINE = 10,         // 强制下线
  MEETING_USER_VIDEO_CHANGE = 11, // 用户视频改变
  // WebRTC 信令类型
  WEBRTC_OFFER = 12,           // WebRTC Offer
  WEBRTC_ANSWER = 13,          // WebRTC Answer
  WEBRTC_ICE_CANDIDATE = 14    // ICE Candidate
}

// 消息发送目标类型
export enum MessageSendToType {
  USER = 0,   // 发送给个人
  GROUP = 1   // 发送给群组（会议房间）
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

// 会议成员信息
export interface MeetingMember {
  userId: string
  nickName: string
  joinTime: number
  memberType: number
  status: number
  videoOpen: boolean
  sex: number
}

// 加入会议消息内容
export interface MeetingJoinContent {
  newMember: MeetingMember
  meetingMemberList: MeetingMember[]
}

// 退出会议消息内容
export interface MeetingExitContent {
  exitUserId: string
  exitStatus: number  // 0=正常退出, 1=踢出, 2=拉黑
  meetingMemberList: MeetingMember[]
}

// 成员状态枚举（与后端 MeetingMemberStatusEnum 对应）
export enum MemberStatus {
  DEL_MEETING = 0,   // 删除会议
  NORMAL = 1,        // 正常
  EXIT_MEETING = 2,  // 正常退出会议
  KICK_OUT = 3,      // 被踢出会议
  BLACKLIST = 4      // 被拉黑
}

// 成员类型枚举（与后端 MemberTypeEnum 对应）
export enum MemberType {
  NORMAL = 0,      // 普通成员
  CREATOR = 1      // 创建者/主持人
}

type MessageHandler = (message: WebSocketMessage) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectTimer: number | null = null
  private heartbeatTimer: number | null = null
  private messageHandlers: Map<MessageType, MessageHandler[]> = new Map()
  private isConnecting = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000

  // WebSocket 服务器地址
  private getWsUrl(): string {
    const userStore = useUserStore()
    const token = userStore.token
    
    // 获取当前协议
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const hostname = location.hostname
    
    // 1. 如果是生产环境/HTTPS 环境，必须使用 WSS 且走 Nginx 转发
    //    地址格式: wss://domain.com/ws (不带 6061 端口，复用 443 端口)
    if (location.protocol === 'https:') {
      return `${protocol}//${location.host}/ws?token=${token}`
    }
    
    // 2. 如果是本地开发环境 (localhost/127.0.0.1)，通常没有 Nginx 转发，直连后端 6061 端口
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:6061/ws?token=${token}`
    }
    
    // 3. 其他 HTTP 环境（如 IP 访问），优先尝试走 Nginx 转发（复用当前端口）
    //    地址格式: ws://ip:port/ws
    return `${protocol}//${location.host}/ws?token=${token}`
  }

  // 连接 WebSocket
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected')
        resolve()
        return
      }

      if (this.isConnecting) {
        console.log('WebSocket is already connecting, waiting...')
        // 等待连接完成而不是拒绝
        const checkInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearInterval(checkInterval)
            resolve()
          } else if (!this.isConnecting) {
            clearInterval(checkInterval)
            reject(new Error('WebSocket connection failed'))
          }
        }, 100)
        return
      }

      const userStore = useUserStore()
      if (!userStore.token) {
        console.error('No token available for WebSocket connection')
        reject(new Error('No token available'))
        return
      }

      this.isConnecting = true
      const wsUrl = this.getWsUrl()
      console.log('Connecting to WebSocket:', wsUrl)

      try {
        this.ws = new WebSocket(wsUrl)
      } catch (error) {
        console.error('Failed to create WebSocket:', error)
        this.isConnecting = false
        reject(error)
        return
      }

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.startHeartbeat()
        resolve()
      }

      this.ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data)
        this.handleMessage(event.data)
      }

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason, 'wasClean:', event.wasClean)
        this.isConnecting = false
        this.stopHeartbeat()
        // 只有在非正常关闭时才尝试重连
        if (!event.wasClean) {
          this.attemptReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
        reject(error)
      }

      // 设置连接超时
      setTimeout(() => {
        if (this.isConnecting) {
          console.error('WebSocket connection timeout')
          this.isConnecting = false
          if (this.ws) {
            this.ws.close()
          }
          reject(new Error('WebSocket connection timeout'))
        }
      }, 10000) // 10秒超时
    })
  }

  // 断开连接
  disconnect() {
    this.stopHeartbeat()
    this.stopReconnect()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  // 发送消息
  send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  // 注册消息处理器
  on(type: MessageType, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, [])
    }
    this.messageHandlers.get(type)!.push(handler)
  }

  // 移除消息处理器
  off(type: MessageType, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(type)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  // 处理收到的消息
  private handleMessage(data: string) {
    // 心跳响应不需要解析
    if (data === 'pong' || data === 'heart') {
      console.log('Heartbeat response received')
      return
    }
    
    try {
      const message: WebSocketMessage = JSON.parse(data)
      console.log('Received message:', message)

      const handlers = this.messageHandlers.get(message.messageType)
      if (handlers) {
        handlers.forEach(handler => handler(message))
      }

      // 处理强制下线
      if (message.messageType === MessageType.FORCE_OFF_LINE) {
        const userStore = useUserStore()
        userStore.logout()
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  // 心跳检测
  private startHeartbeat() {
    // 立即发送一次心跳，确保连接建立后马上有消息交互
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send('ping')
    }
    
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // 发送心跳包
        this.ws.send('ping')
        console.log('Heartbeat sent')
      }
    }, 25000) // 每25秒发送一次心跳（比后端120秒超时更频繁）
    
    // 监听页面可见性变化，页面重新可见时立即发送心跳
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
  }
  
  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && this.ws?.readyState === WebSocket.OPEN) {
      console.log('Page became visible, sending heartbeat')
      this.ws.send('ping')
    }
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    // 移除可见性监听
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
  }

  // 重连逻辑
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached')
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch(console.error)
    }, this.reconnectDelay)
  }

  private stopReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.reconnectAttempts = 0
  }

  // 获取连接状态
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// 导出单例
export const wsService = new WebSocketService()
