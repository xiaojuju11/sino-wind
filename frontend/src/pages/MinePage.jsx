import React, { useState, useEffect } from 'react'
import '../styles/minePage.less'
import { ActionSheet, Toast, ImageViewer } from 'antd-mobile'
import { RightOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
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

  const { theme, toggleTheme, isDark } = useTheme()

  // 雅士修持 4 大数据（四维修持）
  const stats = [
    { num: userInfo.appraise_count || 48, label: '识物考源' },
    { num: userInfo.poem_count || 126, label: '诗词温故' },
    { num: userInfo.debate_count || 89, label: '知音鸿雁' },
    { num: userInfo.yayan_count || 34, label: '雅言研习' },
  ]

  return (
    <div className='shuzhai-root'>
      {/* 1. 顶部水墨意境题头 */}
      <header className='shuzhai-header'>
        <div className='shuzhai-header__title-wrap'>
          <h1 className='shuzhai-header__title'>墨隐书斋</h1>
          <span className='shuzhai-header__seal'>两宋</span>
        </div>
        <p className='shuzhai-header__subtitle'>一卷诗书藏风雅 半窗山水养心性</p>
      </header>

      {/* 2. 雅士身份大卡片 */}
      <section className='scholar-card'>
        <div className='scholar-card__profile'>
          <div className='scholar-avatar' onClick={() => setVisibleAvatarViewer(true)}>
            <img
              src={userInfo.avatar || `${BASE}assets/shuzhai/avatar_yunshan.png`}
              alt='雅士头像'
              className='scholar-avatar__img'
            />
          </div>
          <div className='scholar-details'>
            <div className='scholar-details__name-row'>
              <h2 className='scholar-name'>{userInfo.nickname || '云山居士'}</h2>
              <span className='scholar-badge'>
                <i className='iconfont icon-wode scholar-badge__icon'></i>
                {userInfo.title || '翰林学士'}
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

      {/* 3. 列表卡片 1：五大藏品墨卷 */}
      <section className='shuzhai-section-card'>
        <div className='shuzhai-section-head'>
          <div className='shuzhai-section-head__text'>
            <div className='shuzhai-section-head__title-wrap'>
              <h3 className='shuzhai-section-title'>藏品与墨卷</h3>
              <span className='shuzhai-seal'>崇雅</span>
            </div>
            <p className='shuzhai-section-sub'>收藏古今器物与诗词珍品，留存风雅墨迹</p>
          </div>
          <img src={`${BASE}assets/shuzhai/illus_cangpin.png`} alt='插画' className='shuzhai-section-head__illus' />
        </div>

        <div className='shuzhai-list'>
          <div className='shuzhai-list-item' onClick={() => navigate('/recognition')}>
            <i className='iconfont icon-zhanpin'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>物溯宝鉴（已鉴藏品）</span>
              <span className='shuzhai-list-item__desc'>已考证之今物与古器原型</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>

          <div className='shuzhai-list-item' onClick={() => navigate('/poem-collection')}>
            <i className='iconfont icon-zhinan'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>我的诗笺</span>
              <span className='shuzhai-list-item__desc'>收录的古诗词与摘录笔记</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>

          <div className='shuzhai-list-item' onClick={() => navigate('/letters')}>
            <i className='iconfont icon-shoucang-yishoucang'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>知音鸿雁（往来信札）</span>
              <span className='shuzhai-list-item__desc'>与李白、苏轼等千古知己交谈归档</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>

          <div className='shuzhai-list-item' onClick={() => {
            const count = JSON.parse(localStorage.getItem('gufeng_yayan_list') || '[]').length
            Toast.show({ content: `已收录 ${count} 卷两宋白话雅言` })
          }}>
            <i className='iconfont icon-homework'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>雅译锦囊</span>
              <span className='shuzhai-list-item__desc'>今人白话化两宋雅言之研习札记</span>
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
            <p className='shuzhai-section-sub'>管理账号设置与日月墨境，守护文心印记</p>
          </div>
          <img src={`${BASE}assets/shuzhai/illus_qinggui.png`} alt='插画' className='shuzhai-section-head__illus' />
        </div>

        <div className='shuzhai-list'>
          <div className='shuzhai-list-item' onClick={toggleTheme}>
            <i className='iconfont icon-tongzhi'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>日月交替（墨境切换）</span>
              <span className='shuzhai-list-item__desc'>当前为：{isDark ? '🌙 月下墨境（暗色）' : '☀️ 晓色晨宣（浅色）'}</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>

          <div className='shuzhai-list-item' onClick={() => navigate('/accountSetting')}>
            <i className='iconfont icon-zhanghao'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>账号设置</span>
              <span className='shuzhai-list-item__desc'>个人资料与账号管理</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>

          <div className='shuzhai-list-item' onClick={() => Toast.show('岁时节气通知已开启')}>
            <i className='iconfont icon-tongzhi'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>消息通知</span>
              <span className='shuzhai-list-item__desc'>岁时节气与知音回信提醒</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>

          <div className='shuzhai-list-item' onClick={() => Toast.show('云山竹简 · 华风雅集 v2.0')}>
            <i className='iconfont icon-wenhao-yuankuang'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>关于云山竹简</span>
              <span className='shuzhai-list-item__desc'>国风两宋美学研习平台</span>
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