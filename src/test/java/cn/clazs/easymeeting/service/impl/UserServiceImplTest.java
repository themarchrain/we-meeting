package cn.clazs.easymeeting.service.impl;

import cn.clazs.easymeeting.config.AppConfig;
import cn.clazs.easymeeting.entity.dto.LoginDTO;
import cn.clazs.easymeeting.entity.enums.UserStatus;
import cn.clazs.easymeeting.entity.po.UserInfo;
import cn.clazs.easymeeting.entity.vo.UserInfoVO;
import cn.clazs.easymeeting.mapper.UserMapper;
import cn.clazs.easymeeting.redis.RedisComponent;
import cn.clazs.easymeeting.util.StringUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserMapper userMapper;

    @Mock
    private AsyncUserServiceImpl asyncUserInfoService;

    @Mock
    private AppConfig appConfig;

    @Mock
    private RedisComponent redisComponent;

    @InjectMocks
    private UserServiceImpl userService;

    @Test
    void loginAllowsNewSessionWhenPreviousSessionDidNotLogoutCleanly() {
        LoginDTO dto = new LoginDTO();
        dto.setEmail("user@example.com");
        dto.setPassword(StringUtil.encodeMd5("123456"));
        dto.setCheckCode("1234");
        dto.setCheckCodeKey("key");

        UserInfo userInfo = new UserInfo();
        userInfo.setUserId("100000000001");
        userInfo.setEmail(dto.getEmail());
        userInfo.setNickName("tester");
        userInfo.setPassword(dto.getPassword());
        userInfo.setStatus(UserStatus.ENABLED.getCode());
        userInfo.setLastLoginTime(2000L);
        userInfo.setLastOffTime(1000L);
        userInfo.setMeetingNo("1000000001");

        when(userMapper.selectByEmail(dto.getEmail())).thenReturn(userInfo);
        when(appConfig.getAdminEmails()).thenReturn("");

        UserInfoVO result = userService.login(dto);

        assertEquals(userInfo.getUserId(), result.getUserId());
        assertNotNull(result.getToken());
        verify(redisComponent).saveUserTokenInfo(any());
        verify(asyncUserInfoService).updateLoginTime(userInfo);
    }
}
