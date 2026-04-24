import { wsService, MessageType, MessageSendToType } from './websocket'
import type { WebSocketMessage } from './websocket'

// WebRTC 配置 - 优化连接质量和速度
const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' }
  ],
  // 优化 ICE 传输策略
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
}

const videoConstraints: MediaTrackConstraints = {
  width: { min: 320, ideal: 640, max: 1280 },
  height: { min: 240, ideal: 480, max: 720 },
  frameRate: { min: 10, ideal: 24, max: 30 },
  facingMode: 'user'
}

// 视频流回调类型
type StreamCallback = (userId: string, stream: MediaStream) => void
type StreamRemovedCallback = (userId: string) => void
type ConnectionStateCallback = (userId: string, state: string) => void

/**
 * WebRTC 连接管理器
 * 封装 WebRTC 连接的创建、管理和清理逻辑
 */
export class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map()
  private remoteStreams: Map<string, MediaStream> = new Map()
  private localStream: MediaStream | null = null
  private meetingId: string = ''
  private userId: string = ''
  private initialized: boolean = false
  
  // 回调函数
  private onRemoteStream: StreamCallback | null = null
  private onStreamRemoved: StreamRemovedCallback | null = null
  private onConnectionStateChange: ConnectionStateCallback | null = null
  private renegotiationTimers: Map<string, number> = new Map()
  
  // 绑定的事件处理器（保存引用以便正确移除）
  private boundHandleOffer: (message: WebSocketMessage) => Promise<void>
  private boundHandleAnswer: (message: WebSocketMessage) => Promise<void>
  private boundHandleIceCandidate: (message: WebSocketMessage) => Promise<void>

  constructor() {
    // 预先绑定事件处理器，保存引用
    this.boundHandleOffer = this.handleOffer.bind(this)
    this.boundHandleAnswer = this.handleAnswer.bind(this)
    this.boundHandleIceCandidate = this.handleIceCandidate.bind(this)
  }

  /**
   * 初始化管理器
   */
  init(
    meetingId: string, 
    userId: string, 
    onRemoteStream: StreamCallback, 
    onStreamRemoved: StreamRemovedCallback,
    onConnectionStateChange?: ConnectionStateCallback
  ) {
    // 如果已经初始化过，先清理
    if (this.initialized) {
      this.cleanup()
    }
    
    this.meetingId = meetingId
    this.userId = userId
    this.onRemoteStream = onRemoteStream
    this.onStreamRemoved = onStreamRemoved
    this.onConnectionStateChange = onConnectionStateChange || null
    this.initialized = true
    
    // 注册 WebSocket 消息处理器
    wsService.on(MessageType.WEBRTC_OFFER, this.boundHandleOffer)
    wsService.on(MessageType.WEBRTC_ANSWER, this.boundHandleAnswer)
    wsService.on(MessageType.WEBRTC_ICE_CANDIDATE, this.boundHandleIceCandidate)
    
    console.log('WebRTCManager initialized for meeting:', meetingId, 'user:', userId)
  }

  /**
   * 初始化本地媒体流
   * 优化：支持多浏览器共享摄像头，提高视频流畅度
   */
  async initLocalMedia(videoEnabled: boolean = true, audioEnabled: boolean = true): Promise<MediaStream | null> {
    // 确保先清理旧的媒体流，防止设备被占用
    this.stopLocalMedia()

    try {
      // 检查是否在安全上下文中
      if (!window.isSecureContext) {
        console.error('getUserMedia requires a secure context (HTTPS or localhost)')
        throw new Error('需要 HTTPS 或 localhost 环境才能访问摄像头/麦克风')
      }
      
      // 检查浏览器是否支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia is not supported in this browser')
        throw new Error('当前浏览器不支持摄像头/麦克风访问')
      }
      
      // 优化的媒体约束配置
      // 1. 使用较低分辨率和帧率以支持多浏览器共享
      // 2. 不使用 exact 约束，让浏览器灵活选择
      const constraints: MediaStreamConstraints = {
        video: videoEnabled ? videoConstraints : false,
        audio: audioEnabled ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // 降低音频采样率以减少带宽
          sampleRate: { ideal: 44100 },
          channelCount: { ideal: 1 }
        } : false
      }
      
      console.log('Requesting media with constraints:', JSON.stringify(constraints))
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('Got local stream with tracks:', this.localStream.getTracks().map(t => `${t.kind}:${t.label}`))
      return this.localStream
    } catch (error: any) {
      console.error('Failed to get local media:', error)
      
      // 如果视频获取失败，尝试降级策略
      if (videoEnabled) {
        // 策略1: 尝试更低的分辨率
        if (error.name === 'OverconstrainedError' || error.name === 'NotReadableError') {
          console.log('Trying lower resolution...')
          try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } },
              audio: audioEnabled ? {
                echoCancellation: true,
                noiseSuppression: true
              } : false
            })
            console.log('Got low-res stream')
            return this.localStream
          } catch (lowResError) {
            console.error('Low-res also failed:', lowResError)
          }
        }
        
        // 策略2: 只获取音频
        console.log('Video failed, trying audio only...')
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: audioEnabled ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } : false
          })
          console.log('Got audio-only stream')
          return this.localStream
        } catch (audioError) {
          console.error('Failed to get audio-only stream:', audioError)
        }
      }
      
      // 根据错误类型给出更详细的提示
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        console.error('用户拒绝了摄像头/麦克风权限')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        console.error('未找到摄像头或麦克风设备')
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        console.error('摄像头或麦克风被其他程序占用')
      } else if (error.name === 'OverconstrainedError') {
        console.error('请求的媒体约束无法满足')
      } else if (error.name === 'TypeError') {
        console.error('媒体约束配置错误')
      }
      
      return null
    }
  }

  /**
   * 获取本地媒体流
   */
  getLocalStream(): MediaStream | null {
    return this.localStream
  }

  hasLocalVideoTrack(): boolean {
    return !!this.getLiveVideoTrack()
  }

  hasLocalAudioTrack(): boolean {
    return !!this.localStream?.getAudioTracks().some(track => track.readyState === 'live')
  }

  private getLiveVideoTrack(): MediaStreamTrack | null {
    return this.localStream?.getVideoTracks().find(track => track.readyState === 'live') || null
  }

  private async acquireVideoTrack(): Promise<MediaStreamTrack | null> {
    if (!window.isSecureContext) {
      throw new Error('需要 HTTPS 或 localhost 环境才能访问摄像头')
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('当前访问环境不支持摄像头访问，请使用 HTTPS 或 localhost')
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false })
      return stream.getVideoTracks()[0] || null
    } catch (error: any) {
      if (error.name === 'OverconstrainedError' || error.name === 'NotReadableError') {
        const lowResStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } },
          audio: false
        })
        return lowResStream.getVideoTracks()[0] || null
      }
      throw error
    }
  }

  /**
   * 创建与指定用户的 PeerConnection
   * 优化：添加带宽控制和编码参数
   */
  createConnection(remoteUserId: string, addLocalTransceivers = true): RTCPeerConnection {
    console.log('Creating PeerConnection for:', remoteUserId, 'hasLocalStream:', !!this.localStream, 'addLocalTransceivers:', addLocalTransceivers)
    
    // 如果已存在连接且状态良好，直接返回现有连接
    const existingPc = this.peerConnections.get(remoteUserId)
    if (existingPc) {
      const state = existingPc.connectionState
      // 如果连接状态是 connecting, connected 或 new，复用现有连接
      if (state === 'connecting' || state === 'connected' || state === 'new') {
        console.log('Reusing existing connection with:', remoteUserId, 'state:', state)
        return existingPc
      }
      // 否则关闭旧连接
      console.log('Closing stale connection with:', remoteUserId, 'state:', state)
      this.closeConnection(remoteUserId)
    }
    
    const pc = new RTCPeerConnection(rtcConfig)
    this.peerConnections.set(remoteUserId, pc)
    
    if (addLocalTransceivers) {
      this.addInitialLocalTransceivers(pc)
    }
    
    // 监听 ICE Candidate
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // 只发送有效的候选者，减少不必要的信令
        wsService.send({
          messageSendToType: MessageSendToType.USER,
          meetingId: this.meetingId,
          messageType: MessageType.WEBRTC_ICE_CANDIDATE,
          sendUserId: this.userId,
          receiveUserId: remoteUserId,
          messageContent: event.candidate
        })
      }
    }
    
    // 监听远程流
    pc.ontrack = (event) => {
      console.log('=== Received remote track ===')
      console.log('From:', remoteUserId)
      console.log('Track kind:', event.track.kind)
      console.log('Track enabled:', event.track.enabled)
      console.log('Track readyState:', event.track.readyState)
      console.log('Streams count:', event.streams.length)
      
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0]
        this.remoteStreams.set(remoteUserId, stream)
        console.log('Stream id:', stream.id)
        console.log('Stream tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`))
        
        if (this.onRemoteStream) {
          console.log('Calling onRemoteStream callback for:', remoteUserId)
          this.onRemoteStream(remoteUserId, stream)
        } else {
          console.error('onRemoteStream callback is not set!')
        }
      } else {
        console.warn('No stream in track event, creating fallback stream')
        let stream = this.remoteStreams.get(remoteUserId)
        if (!stream) {
          stream = new MediaStream()
          this.remoteStreams.set(remoteUserId, stream)
        }

        if (!stream.getTracks().some(track => track.id === event.track.id)) {
          stream.addTrack(event.track)
        }

        if (this.onRemoteStream) {
          this.onRemoteStream(remoteUserId, stream)
        }
      }
    }
    
    // 监听连接状态
    pc.onconnectionstatechange = () => {
      console.log(`PeerConnection state with ${remoteUserId}:`, pc.connectionState)
      
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(remoteUserId, pc.connectionState)
      }

      if (pc.connectionState === 'connected') {
        console.log(`Successfully connected to ${remoteUserId}`)
        
        // 检查接收器状态
        pc.getReceivers().forEach(receiver => {
           console.log(`Receiver track: ${receiver.track.kind}, id: ${receiver.track.id}, muted: ${receiver.track.muted}, enabled: ${receiver.track.enabled}`)
        })
      } else if (pc.connectionState === 'failed') {
        console.error(`Connection with ${remoteUserId} failed, attempting to restart ICE`)
        pc.restartIce()
      } else if (pc.connectionState === 'disconnected') {
        console.warn(`Connection with ${remoteUserId} disconnected`)
      }
    }
    
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${remoteUserId}:`, pc.iceConnectionState)
      // 可选：也将 ICE 状态通过回调传出去，或者只传 Connection State
      // 这里如果 Connection State 是 failed，通常 ICE 也是 failed
    }
    
    return pc
  }

  private addInitialLocalTransceivers(pc: RTCPeerConnection): void {
    const audioTrack = this.localStream ? this.localStream.getAudioTracks()[0] : null
    const videoTrack = this.localStream ? this.localStream.getVideoTracks()[0] : null

    if (audioTrack && this.localStream) {
      pc.addTransceiver(audioTrack, { direction: 'sendrecv', streams: [this.localStream] })
      console.log('Added audio transceiver with track')
    } else {
      pc.addTransceiver('audio', { direction: 'recvonly' })
      console.log('Added audio transceiver recvonly')
    }

    if (videoTrack && this.localStream) {
      const transceiver = pc.addTransceiver(videoTrack, { direction: 'sendrecv', streams: [this.localStream] })
      this.optimizeVideoEncoding(transceiver.sender)
      console.log('Added video transceiver with track')
    } else {
      pc.addTransceiver('video', { direction: 'recvonly' })
      console.log('Added video transceiver recvonly')
    }
  }

  private async syncLocalTracksToConnection(pc: RTCPeerConnection): Promise<void> {
    if (!this.localStream) {
      return
    }

    const audioTrack = this.localStream.getAudioTracks()[0]
    const videoTrack = this.localStream.getVideoTracks()[0]

    const audioTransceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'audio')
    if (audioTransceiver && audioTrack) {
      if (audioTransceiver.sender.track?.id !== audioTrack.id) {
        await audioTransceiver.sender.replaceTrack(audioTrack)
        console.log('Synced audio track to connection')
      }
      audioTransceiver.sender.setStreams(this.localStream)
      audioTransceiver.direction = 'sendrecv'
    } else if (!audioTransceiver && audioTrack) {
      pc.addTransceiver(audioTrack, { direction: 'sendrecv', streams: [this.localStream] })
      console.log('Added missing audio transceiver while syncing')
    }

    const videoTransceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video')
    if (videoTransceiver && videoTrack) {
      if (videoTransceiver.sender.track?.id !== videoTrack.id) {
        await videoTransceiver.sender.replaceTrack(videoTrack)
        console.log('Synced video track to connection')
      }
      videoTransceiver.sender.setStreams(this.localStream)
      videoTransceiver.direction = 'sendrecv'
      this.optimizeVideoEncoding(videoTransceiver.sender)
    } else if (!videoTransceiver && videoTrack) {
      const transceiver = pc.addTransceiver(videoTrack, { direction: 'sendrecv', streams: [this.localStream] })
      this.optimizeVideoEncoding(transceiver.sender)
      console.log('Added missing video transceiver while syncing')
    }
  }

  /**
   * 优化视频编码参数
   */
  private async optimizeVideoEncoding(sender: RTCRtpSender): Promise<void> {
    try {
      const params = sender.getParameters()
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}]
      }
      
      // 设置最大比特率和帧率，提高流畅度
      params.encodings[0].maxBitrate = 500000 // 500 kbps
      params.encodings[0].maxFramerate = 24
      // 优先保证流畅度而非清晰度
      params.encodings[0].priority = 'high'
      params.encodings[0].networkPriority = 'high'
      
      await sender.setParameters(params)
      console.log('Video encoding optimized')
    } catch (error) {
      console.warn('Failed to optimize video encoding:', error)
    }
  }

  /**
   * 向指定用户发起连接（作为 Offer 方）
   * 即使没有本地流也会发起连接（recvonly 模式），确保能接收对方的视频
   */
  async initiateConnection(remoteUserId: string): Promise<void> {
    console.log('Initiating connection to:', remoteUserId, 'hasLocalStream:', !!this.localStream)
    
    // 如果没有本地流，等待一下（给摄像头初始化一些时间）
    if (!this.localStream) {
      console.log('Waiting for local stream before initiating connection...')
      let waitTime = 0
      const maxWait = 3000  // 等待 3 秒
      const checkInterval = 100
      
      while (!this.localStream && waitTime < maxWait) {
        await new Promise(resolve => setTimeout(resolve, checkInterval))
        waitTime += checkInterval
      }
      
      if (this.localStream) {
        console.log('Local stream ready after', waitTime, 'ms')
      } else {
        // 【修改】即使没有本地流，也要发起连接
        // 这样至少可以接收对方的视频（recvonly 模式）
        console.warn('Local stream not ready after', maxWait, 'ms, proceeding with recvonly connection')
      }
    }
    
    // 检查是否已有活跃连接
    const existingPc = this.peerConnections.get(remoteUserId)
    if (existingPc) {
      const state = existingPc.connectionState
      if (state === 'connected') {
        console.log('Already connected to:', remoteUserId, '- skipping')
        return
      }
      if (state === 'connecting') {
        console.log('Already connecting to:', remoteUserId, '- skipping')
        return
      }
    }
    
    const pc = this.createConnection(remoteUserId, true)
    
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      
      const hasLocalTracks = this.localStream ? this.localStream.getTracks().length > 0 : false
      console.log('Sending offer to:', remoteUserId, 'hasLocalTracks:', hasLocalTracks)
      wsService.send({
        messageSendToType: MessageSendToType.USER,
        meetingId: this.meetingId,
        messageType: MessageType.WEBRTC_OFFER,
        sendUserId: this.userId,
        receiveUserId: remoteUserId,
        messageContent: offer
      })
    } catch (error) {
      console.error('Failed to create offer:', error)
    }
  }

  /**
   * 处理收到的 Offer
   */
  private async handleOffer(message: WebSocketMessage): Promise<void> {
    const remoteUserId = message.sendUserId!
    const offerSdp = message.messageContent?.sdp || ''
    const isRecvOnlyOffer = offerSdp.includes('a=recvonly')
    
    console.log('Received offer from:', remoteUserId, 'hasLocalStream:', !!this.localStream, 'isRecvOnlyOffer:', isRecvOnlyOffer)
    
    // 如果本地流还没准备好，等待一段时间
    // 这解决了新成员加入时，现有成员的 Offer 到达太快的问题
    if (!this.localStream) {
      console.log('Local stream not ready, waiting...')
      let waitTime = 0
      const maxWait = 5000 // 最多等待 5 秒（增加等待时间）
      const checkInterval = 100
      
      while (!this.localStream && waitTime < maxWait) {
        await new Promise(resolve => setTimeout(resolve, checkInterval))
        waitTime += checkInterval
      }
      
      // 重新检查 localStream（TypeScript 需要这样才能正确推断类型）
      const stream = this.localStream as MediaStream | null
      if (stream) {
        console.log('Local stream ready after', waitTime, 'ms, tracks:', stream.getTracks().length)
      } else {
        console.warn('Local stream still not ready after', maxWait, 'ms, proceeding without it')
      }
    }
    
    // 检查是否已有连接
    const existingPc = this.peerConnections.get(remoteUserId)
    if (existingPc) {
      const state = existingPc.connectionState
      // 如果已经连接，检查是否需要处理重新协商
      if (state === 'connected') {
        // 如果是重新协商的 Offer（对方添加了新轨道），需要处理
        console.log('Received offer on existing connected connection, handling renegotiation')
        try {
          await existingPc.setRemoteDescription(new RTCSessionDescription(message.messageContent))
          await this.syncLocalTracksToConnection(existingPc)
          const answer = await existingPc.createAnswer()
          await existingPc.setLocalDescription(answer)
          
          console.log('Sending renegotiation answer to:', remoteUserId)
          wsService.send({
            messageSendToType: MessageSendToType.USER,
            meetingId: this.meetingId,
            messageType: MessageType.WEBRTC_ANSWER,
            sendUserId: this.userId,
            receiveUserId: remoteUserId,
            messageContent: answer
          })
        } catch (error) {
          console.error('Failed to handle renegotiation offer:', error)
        }
        return
      }
      // 如果正在连接中，可能是双方同时发起，使用 userId 比较决定谁让步
      if (state === 'connecting' || state === 'new') {
        // 如果我的 userId 更大，我让步，接受对方的 Offer
        // 如果我的 userId 更小，忽略对方的 Offer，继续我的连接
        if (this.userId < remoteUserId) {
          console.log('Glare detected, my userId is smaller, ignoring offer from:', remoteUserId)
          return
        }
        console.log('Glare detected, my userId is larger, accepting offer from:', remoteUserId)
        // 关闭现有连接，接受对方的 Offer
        this.closeConnection(remoteUserId)
      }
    }
    
    const pc = this.createConnection(remoteUserId, false)
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(message.messageContent))
      await this.syncLocalTracksToConnection(pc)
      
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      
      console.log('Sending answer to:', remoteUserId)
      wsService.send({
        messageSendToType: MessageSendToType.USER,
        meetingId: this.meetingId,
        messageType: MessageType.WEBRTC_ANSWER,
        sendUserId: this.userId,
        receiveUserId: remoteUserId,
        messageContent: answer
      })
      
      // 【关键修复】如果收到的是 recvonly Offer，说明对方没有视频流
      // 我们需要主动发起一个新的连接，让对方能收到我们的视频
      // 同时我们也能请求对方发送视频（如果对方后来有了视频流）
      if (isRecvOnlyOffer && this.localStream) {
        console.log('Received recvonly offer, will initiate reverse connection to send our video')
        // 延迟一点，确保当前协商完成
        setTimeout(() => {
          this.renegotiateConnection(remoteUserId)
        }, 1500)
      }
      // 如果本地流在创建连接时还没准备好，但现在准备好了
      // 需要发起重新协商，让对方能收到我们的视频流
      else if (this.localStream) {
        const hasVideoTrack = this.localStream.getVideoTracks().length > 0
        const hasAudioTrack = this.localStream.getAudioTracks().length > 0
        
        const videoSenderSending = pc.getSenders().some(s => s.track?.kind === 'video')
        const audioSenderSending = pc.getSenders().some(s => s.track?.kind === 'audio')
        
        if ((hasVideoTrack && !videoSenderSending) || (hasAudioTrack && !audioSenderSending)) {
          console.log('Local stream has tracks but not sending, triggering renegotiation with:', remoteUserId)
          // 延迟一点再发起重新协商，确保当前协商完成
          setTimeout(() => {
            this.renegotiateConnection(remoteUserId)
          }, 1000)
        }
      }
    } catch (error) {
      console.error('Failed to handle offer:', error)
    }
  }
  
  /**
   * 重新协商连接（当本地流后来准备好时使用）
   * 向对方发送新的 Offer，包含我们的媒体轨道
   */
  private async renegotiateConnection(remoteUserId: string): Promise<void> {
    const pc = this.peerConnections.get(remoteUserId)
    if (!pc || !this.localStream) {
      return
    }
    
    console.log('Renegotiating connection with:', remoteUserId, 'to update local tracks')
    
    try {
      await this.syncLocalTracksToConnection(pc)

      if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
        console.log('Connection cannot renegotiate:', pc.connectionState)
        return
      }

      if (pc.signalingState !== 'stable') {
        console.log('Connection signaling state is not stable, schedule renegotiation:', pc.signalingState)
        this.scheduleRenegotiation(remoteUserId)
        return
      }
      
      // 创建新的 Offer
      console.log('Creating renegotiation offer...')
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      
      console.log('Sending renegotiation offer to:', remoteUserId)
      wsService.send({
        messageSendToType: MessageSendToType.USER,
        meetingId: this.meetingId,
        messageType: MessageType.WEBRTC_OFFER,
        sendUserId: this.userId,
        receiveUserId: remoteUserId,
        messageContent: offer
      })
    } catch (error) {
      console.error('Failed to renegotiate connection:', error)
    }
  }

  private scheduleRenegotiation(remoteUserId: string, delay = 800): void {
    const existingTimer = this.renegotiationTimers.get(remoteUserId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = window.setTimeout(() => {
      this.renegotiationTimers.delete(remoteUserId)
      this.renegotiateConnection(remoteUserId)
    }, delay)

    this.renegotiationTimers.set(remoteUserId, timer)
  }

  /**
   * 处理收到的 Answer
   */
  private async handleAnswer(message: WebSocketMessage): Promise<void> {
    const remoteUserId = message.sendUserId!
    console.log('Received answer from:', remoteUserId)
    
    const pc = this.peerConnections.get(remoteUserId)
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(message.messageContent))
      } catch (error) {
        console.error('Failed to set remote description:', error)
      }
    }
  }

  /**
   * 处理收到的 ICE Candidate
   */
  private async handleIceCandidate(message: WebSocketMessage): Promise<void> {
    const remoteUserId = message.sendUserId!
    console.log('Received ICE candidate from:', remoteUserId)
    
    const pc = this.peerConnections.get(remoteUserId)
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(message.messageContent))
      } catch (error) {
        console.error('Failed to add ICE candidate:', error)
      }
    }
  }

  /**
   * 关闭与指定用户的连接
   */
  closeConnection(userId: string): void {
    const pc = this.peerConnections.get(userId)
    if (pc) {
      pc.close()
      this.peerConnections.delete(userId)
      this.remoteStreams.delete(userId)
      console.log('Closed connection with:', userId)
      
      if (this.onStreamRemoved) {
        this.onStreamRemoved(userId)
      }
    }
  }

  /**
   * 关闭所有 PeerConnection
   */
  closeAllConnections(): void {
    console.log('Closing all peer connections, count:', this.peerConnections.size)
    this.peerConnections.forEach((pc, userId) => {
      pc.close()
      this.remoteStreams.delete(userId)
      if (this.onStreamRemoved) {
        this.onStreamRemoved(userId)
      }
    })
    this.peerConnections.clear()
    this.remoteStreams.clear()
  }

  /**
   * 停止本地媒体流
   */
  stopLocalMedia(): void {
    if (this.localStream) {
      console.log('Stopping local media tracks')
      this.localStream.getTracks().forEach(track => {
        try {
          track.stop()
          console.log(`Stopped track: ${track.kind} (${track.label})`)
        } catch (e) {
          console.error(`Failed to stop track: ${track.kind}`, e)
        }
      })
      this.localStream = null
    }
  }

  /**
   * 切换视频轨道状态
   */
  async toggleVideo(enabled: boolean): Promise<boolean> {
    if (!enabled) {
      this.localStream?.getVideoTracks().forEach(track => {
        track.enabled = false
      })
      return true
    }

    let videoTrack = this.getLiveVideoTrack()
    if (!videoTrack) {
      videoTrack = await this.acquireVideoTrack()
      if (!videoTrack) {
        return false
      }

      if (!this.localStream) {
        this.localStream = new MediaStream()
      }

      this.localStream.getVideoTracks().forEach(oldTrack => {
        this.localStream?.removeTrack(oldTrack)
        oldTrack.stop()
      })
      this.localStream.addTrack(videoTrack)
    }

    videoTrack.enabled = true

    const renegotiations = Array.from(this.peerConnections.keys()).map(remoteUserId =>
      this.renegotiateConnection(remoteUserId)
    )
    await Promise.all(renegotiations)

    return true
  }

  async refreshLocalTracks(): Promise<void> {
    const renegotiations = Array.from(this.peerConnections.keys()).map(remoteUserId =>
      this.renegotiateConnection(remoteUserId)
    )
    await Promise.all(renegotiations)
  }

  hasStreamVideo(stream: MediaStream | null | undefined): boolean {
    return !!stream?.getVideoTracks().some(track => track.readyState === 'live')
  }

  hasStreamAudio(stream: MediaStream | null | undefined): boolean {
    return !!stream?.getAudioTracks().some(track => track.readyState === 'live')
  }

  setLocalVideoEnabled(enabled: boolean): void {
    const track = this.getLiveVideoTrack()
    if (track) {
      track.enabled = enabled
    }
  }

  /**
   * 切换音频轨道状态
   */
  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled
      })
    }
  }

  /**
   * 完整清理（关闭所有连接 + 停止本地媒体）
   */
  cleanup(): void {
    console.log('WebRTCManager cleanup')
    this.renegotiationTimers.forEach(timer => clearTimeout(timer))
    this.renegotiationTimers.clear()
    this.closeAllConnections()
    this.stopLocalMedia()
    
    // 使用保存的引用移除 WebSocket 消息处理器
    if (this.initialized) {
      wsService.off(MessageType.WEBRTC_OFFER, this.boundHandleOffer)
      wsService.off(MessageType.WEBRTC_ANSWER, this.boundHandleAnswer)
      wsService.off(MessageType.WEBRTC_ICE_CANDIDATE, this.boundHandleIceCandidate)
      this.initialized = false
    }
    
    // 重置状态
    this.meetingId = ''
    this.userId = ''
    this.onRemoteStream = null
    this.onStreamRemoved = null
    this.onConnectionStateChange = null
  }

  /**
   * 检查是否有与指定用户的连接
   */
  hasConnection(userId: string): boolean {
    return this.peerConnections.has(userId)
  }

  /**
   * 获取当前连接数
   */
  getConnectionCount(): number {
    return this.peerConnections.size
  }
}

// 导出单例
export const webRTCManager = new WebRTCManager()
