import React, { useState, useEffect } from 'react'
import '../styles/minePage.less'
import { ActionSheet, Toast, ImageViewer } from 'antd-mobile'
import { RightOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../context/ThemeToggle.jsx'
import axios from '../http'

export default function MinePage() {
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState({})
  const [visibleLogout, setVisibleLogout] = useState(false)
  const [visibleAvatarViewer, setVisibleAvatarViewer] = useState(false)

  // 1. 获取用户信息与修持数据（带优雅的古风兜底默认值）
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.get('/api/auth/info', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        if (res.data) setUserInfo(res.data)
      }).catch(() => {
        // 后端若未启动或token过期则走默认设计稿展示
      })
    }
  }, [])

  // 退出登录操作选项
  const logoutActions = [
    { text: '整装离席（确认退出）', key: 'confirm', danger: true }
  ]

  const handleLogoutAction = (action) => {
    if (action.key === 'confirm') {
      setVisibleLogout(false)
      localStorage.removeItem('token')
      Toast.show({ content: '已整装离席', icon: 'success' })
      navigate('/login')
    }
  }

  // 雅士修持 4 大数据（优先读取后端，若无则展示设计稿数据）
  const stats = [
    { num: userInfo.appraise_count || 12, label: '鉴宝藏器' },
    { num: userInfo.debate_count || 36, label: '论道问策' },
    { num: userInfo.poem_count || 48, label: '诗签摘录' },
    { num: userInfo.rank_level || '玖阶', label: '文风品阶' },
  ]

  return (
    <div className='shuzhai-root'>
      {/* 1. 顶部水墨意境题头 */}
      <header className='shuzhai-header'>
        <div className='shuzhai-header__title-wrap'>
          <h1 className='shuzhai-header__title'>墨隐书斋</h1>
          <span className='shuzhai-header__seal'>云山竹简</span>
        </div>
        <p className='shuzhai-header__subtitle'>一卷诗书藏风雅 半窗山水养心性</p>
      </header>

      {/* 2. 雅士身份大卡片 */}
      <section className='scholar-card'>
        <div className='scholar-card__profile'>
          <div className='scholar-avatar' onClick={() => setVisibleAvatarViewer(true)}>
            <img
              src={userInfo.avatar || '/assets/shuzhai/avatar_yunshan.png'}
              alt='雅士头像'
              className='scholar-avatar__img'
            />
          </div>
          <div className='scholar-details'>
            <div className='scholar-details__name-row'>
              <h2 className='scholar-name'>{userInfo.nickname || '云山居士'}</h2>
              <span className='scholar-badge'>
                <i className='iconfont icon-wode scholar-badge__icon'></i>
                {userInfo.title || '翰林待诏'}
              </span>
            </div>
            <p className='scholar-motto'>读千年风雅 与君共此山河</p>
          </div>
        </div>

        {/* 四列修持数据看板 */}
        <div className='scholar-stats'>
          {stats.map((item, idx) => (
            <div key={idx} className='scholar-stats__item'>
              <div className='scholar-stats__num'>{item.num}</div>
              <div className='scholar-stats__label'>{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. 列表卡片 1：藏品与墨卷 */}
      <section className='shuzhai-section-card'>
        <div className='shuzhai-section-head'>
          <div className='shuzhai-section-head__text'>
            <div className='shuzhai-section-head__title-wrap'>
              <h3 className='shuzhai-section-title'>藏品与墨卷</h3>
              <span className='shuzhai-seal'>崇雅</span>
            </div>
            <p className='shuzhai-section-sub'>收藏诗词珍品，留存风雅墨迹</p>
          </div>
          <img src='/assets/shuzhai/illus_cangpin.png' alt='插画' className='shuzhai-section-head__illus' />
        </div>

        <div className='shuzhai-list'>
          <div className='shuzhai-list-item' onClick={() => Toast.show('藏器殿堂筹备中')}>
            <i className='iconfont icon-zhanpin'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>我的藏品</span>
              <span className='shuzhai-list-item__desc'>已收藏的文物与鉴赏记录</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>

          <div className='shuzhai-list-item' onClick={() => navigate('/poem-collection')}>
            <i className='iconfont icon-zhinan'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>我的诗笺</span>
              <span className='shuzhai-list-item__desc'>收录的诗词与摘录笔记</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>

          <div className='shuzhai-list-item' onClick={() => Toast.show('创作墨卷筹备中')}>
            <i className='iconfont icon-homework'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>我的墨卷</span>
              <span className='shuzhai-list-item__desc'>个人创作与读书札记</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>

          <div className='shuzhai-list-item' onClick={() => Toast.show('雅集记录筹备中')}>
            <i className='iconfont icon-shoucang-yishoucang'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>我的雅集</span>
              <span className='shuzhai-list-item__desc'>参与的论道与诗会活动</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>
        </div>
      </section>

      {/* 4. 列表卡片 2：书斋清规 */}
      <section className='shuzhai-section-card'>
        <div className='shuzhai-section-head'>
          <div className='shuzhai-section-head__text'>
            <div className='shuzhai-section-head__title-wrap'>
              <h3 className='shuzhai-section-title'>书斋清规</h3>
              <span className='shuzhai-seal'>永兴</span>
            </div>
            <p className='shuzhai-section-sub'>管理账号设置，守护文心印记</p>
          </div>
          <img src='/assets/shuzhai/illus_qinggui.png' alt='插画' className='shuzhai-section-head__illus' />
        </div>

        <div className='shuzhai-list'>
          <div className='shuzhai-list-item' onClick={() => navigate('/accountSetting')}>
            <i className='iconfont icon-zhanghao'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>账号设置</span>
              <span className='shuzhai-list-item__desc'>个人资料与账号管理</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>

          {/* 墨色雅意：日月主题快捷切换（TRD §3.5 书斋清规 / AC-D4 双向同步；控件为成员 A 提供的共享 ThemeToggle） */}
          <div className='shuzhai-list-item shuzhai-list-item--theme'>
            <i className='iconfont icon-shezhi'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>墨色雅意</span>
              <span className='shuzhai-list-item__desc'>晓色晨宣 / 月下墨境切换</span>
            </div>
            <ThemeToggle className='shuzhai-theme-toggle' />
          </div>

          <div className='shuzhai-list-item' onClick={() => Toast.show('印章保护安全生效中')}>
            <i className='iconfont icon-suo'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>隐私与安全</span>
              <span className='shuzhai-list-item__desc'>密码修改与印章保护</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>

          <div className='shuzhai-list-item' onClick={() => Toast.show('岁时节气通知已开启')}>
            <i className='iconfont icon-tongzhi'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>消息通知</span>
              <span className='shuzhai-list-item__desc'>活动与系统消息设置</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>

          <div className='shuzhai-list-item' onClick={() => Toast.show('常见答疑：可向先贤畅谈')}>
            <i className='iconfont icon-wenhao-yuankuang'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>帮助与反馈</span>
              <span className='shuzhai-list-item__desc'>常见问题与意见反馈</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>
        </div>
      </section>

      {/* 5. 整装离席退出按钮 */}
      <div className='shuzhai-logout-wrap'>
        <button className='shuzhai-logout-btn' onClick={() => setVisibleLogout(true)}>
          整 装 离 席
        </button>
      </div>

      {/* 退出登录确认弹窗 */}
      <ActionSheet
        visible={visibleLogout}
        actions={logoutActions}
        cancelText='留步细品'
        onClose={() => setVisibleLogout(false)}
        onAction={handleLogoutAction}
      />

      {/* 头像大图查看器 */}
      <ImageViewer
        image={userInfo.avatar || '/assets/shuzhai/avatar_yunshan.png'}
        visible={visibleAvatarViewer}
        onClose={() => setVisibleAvatarViewer(false)}
      />
    </div>
  )
}