import request from './index'

export interface MeetingReserve {
  meetingId: string
  meetingName: string
  joinType: number
  joinPassword?: string
  duration: number
  startTime: string
  createTime: string
  createUserId: string
  status: number
  realMeetingId?: string
}

export interface CreateReserveParams {
  meetingName: string
  joinType?: number
  joinPassword?: string
  duration?: number
  startTime: string
}

// 加载预约会议列表
export function loadMeetingReserve(): Promise<MeetingReserve[]> {
  return request.get('/meetingReserve/loadMeetingReserve')
}

// 创建预约会议
export function createMeetingReserve(params: CreateReserveParams): Promise<void> {
  return request.post('/meetingReserve/createMeetingReserve', null, { params })
}

// 删除预约会议
export function delMeetingReserve(meetingId: string): Promise<void> {
  return request.get('/meetingReserve/delMeetingReserve', { params: { meetingId } })
}

// 获取今天的会议
export function loadTodayMeeting(): Promise<MeetingReserve[]> {
  return request.get('/meetingReserve/loadTodayMeeting')
}

// 开始预约会议
export function startReserveMeeting(reserveId: string): Promise<string> {
  return request.get('/meetingReserve/startReserveMeeting', { params: { reserveId } })
}

// 加入预约会议
export function joinReserveMeeting(reserveId: string): Promise<string> {
  return request.get('/meetingReserve/joinReserveMeeting', { params: { reserveId } })
}
