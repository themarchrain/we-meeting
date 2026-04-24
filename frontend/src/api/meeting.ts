import request from './index'
import type { MeetingInfo, MeetingMemberRecord, PageResult, PageParams, MeetingCreateParams, JoinMeetingParams, PreJoinMeetingParams } from '@/types'

// 加载所有历史会议
export function loadMeeting(params: PageParams = {}): Promise<PageResult<MeetingInfo>> {
  return request.get('/meeting/loadMeeting', { params })
}

// 加载我创建的会议
export function loadMyCreatedMeeting(params: PageParams = {}): Promise<PageResult<MeetingInfo>> {
  return request.get('/meeting/loadMyCreatedMeeting', { params })
}

// 加载我参加的会议
export function loadMyJoinedMeeting(params: PageParams = {}): Promise<PageResult<MeetingInfo>> {
  return request.get('/meeting/loadMyJoinedMeeting', { params })
}

// 加载历史会议成员
export function loadMeetingMembers(meetingId: string): Promise<MeetingMemberRecord[]> {
  return request.get('/meeting/loadMeetingMembers', { params: { meetingId } })
}

// 快速会议 - 创建并返回会议ID
export function quickMeeting(params: MeetingCreateParams): Promise<string> {
  return request.post('/meeting/quickMeeting', params)
}

// 预加入会议 - 验证会议号和密码，返回会议ID
export function preJoinMeeting(params: PreJoinMeetingParams): Promise<string> {
  return request.post('/meeting/preJoinMeeting', null, {
    params: {
      meetingNo: params.meetingNo,
      nickName: params.nickName,
      password: params.password
    }
  })
}

// 加入会议
export function joinMeeting(params: JoinMeetingParams): Promise<void> {
  return request.post('/meeting/joinMeeting', params)
}

// 获取当前进行中的会议
export function getCurrentMeeting(): Promise<MeetingInfo | null> {
  return request.get('/meeting/getCurrentMeeting')
}

// 退出会议
export function exitMeeting(): Promise<void> {
  return request.get('/meeting/exitMeeting')
}

// 踢出成员（仅创建者可用）
export function kickOutMember(userId: string): Promise<void> {
  return request.get('/meeting/kickOutMeeting', { params: { userId } })
}

// 拉黑成员（仅创建者可用）
export function blacklistMember(userId: string): Promise<void> {
  return request.get('/meeting/blackMeeting', { params: { userId } })
}

// 结束会议（仅创建者可用）
export function finishMeeting(): Promise<void> {
  return request.get('/meeting/finishMeeting')
}

// 重新加入历史会议 - 设置 currentMeetingId 到 token
export function reserveJoinMeeting(meetingId: string, nickName: string, password?: string): Promise<void> {
  return request.post('/meeting/reserveJoinMeeting', null, {
    params: { meetingId, nickName, password }
  })
}

// 邀请联系人加入会议
export function inviteContactToMeeting(contactIds: string[]): Promise<void> {
  return request.post('/meeting/inviteContactToMeeting', contactIds)
}

// 接受会议邀请（返回 meetingId）
export function acceptInvite(meetingId: string): Promise<string> {
  return request.post('/meeting/acceptInvite', null, {
    params: { meetingId }
  })
}
