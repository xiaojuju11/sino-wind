import React, { useState, useEffect } from 'react'
import '../styles/minePage.less'
import { ActionSheet, Toast, ImageViewer, Popup, Modal } from 'antd-mobile'
import { RightOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/useTheme'
import ThemeToggle from '../context/ThemeToggle.jsx'
import axios from '../http'

const BASE = import.meta.env.BASE_URL

// 两宋白话精选雅言（雅译锦囊核心研习札记）
const PRESET_YAYAN = [
  { ancient: '且慢行', modern: '等一下 / 莫要心急', note: '宋人常用于劝友留步或缓行' },
  { ancient: '休得胡言', modern: '别开玩笑 / 莫要信口开河', note: '宋代市民白话常用口头语' },
  { ancient: '甚善，深契吾心', modern: '太好了 / 深得我意', note: '士大夫赞赏之辞' },
  { ancient: '同去同去', modern: '咱们一块儿去吧', note: '宋元白话中极为传神的邀约' },
  { ancient: '万水千山，且尽一杯', modern: '前路迢迢，先干了这杯', note: '送别饯行必道雅言' },
  { ancient: '人间有味是清欢', modern: '平淡自然的滋味最是长久', note: '东坡居士论生活之味' },
  { ancient: '见怪不怪，其怪自败', modern: '见着奇怪的事泰然处之即可', note: '宋代普贤院白话谚语' }
]

export default function MinePage() {
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState({})
  const [visibleLogout, setVisibleLogout] = useState(false)
  const [visibleAvatarViewer, setVisibleAvatarViewer] = useState(false)
  const [visibleYayanDrawer, setVisibleYayanDrawer] = useState(false)
  const [notifyEnabled, setNotifyEnabled] = useState(true)

  // 1. 获取用户信息与修持数据（带优雅的古风兜底默认值）
  useEffect(() => {
    const fetchInfo = () => {
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
    }

    fetchInfo()

    const handleUpdate = (e) => {
      if (e.detail?.avatar) {
        setUserInfo(prev => ({ ...prev, avatar: e.detail.avatar }))
      }
      if (e.detail?.nickname) {
        setUserInfo(prev => ({ ...prev, nickname: e.detail.nickname }))
      }
      fetchInfo()
    }

    window.addEventListener('userInfoUpdated', handleUpdate)
    return () => window.removeEventListener('userInfoUpdated', handleUpdate)
  }, [])

  // 退出登录操作选项
  const logoutActions = [
    { text: '整装离席（确认退出）', key: 'confirm', danger: true }
  ]

  const handleLogoutAction = (action) => {
    if (action.key === 'confirm') {
      setVisibleLogout(false)
      localStorage.removeItem('token')
      Toast.show({ content: '已整装离席，期君再聚', icon: 'success' })
      navigate('/login')
    }
  }

  const { toggleTheme, isDark } = useTheme()

  // 雅士修持 4 大数据（四维修持）支持点击联动与跳转
  const stats = [
    {
      num: userInfo.appraise_count || 48,
      label: '识物考源',
      onClick: () => navigate('/recognition')
    },
    {
      num: userInfo.poem_count || 126,
      label: '诗词温故',
      onClick: () => navigate('/poem-collection')
    },
    {
      num: userInfo.debate_count || 89,
      label: '知音鸿雁',
      onClick: () => navigate('/letters')
    },
    {
      num: userInfo.yayan_count || 34,
      label: '雅言研习',
      onClick: () => setVisibleYayanDrawer(true)
    },
  ]

  // 复制雅言
  const handleCopyYayan = (text) => {
    navigator.clipboard?.writeText(text).then(() => {
      Toast.show({ content: `「${text}」已收录入袖`, icon: 'success' })
    }).catch(() => {
      Toast.show({ content: `「${text}」` })
    })
  }

  // 关于弹窗
  const handleShowAbout = () => {
    Modal.alert({
      title: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'STKaiti, KaiTi, serif' }}>云山竹简 · 华风雅集</span>
          <span style={{ fontSize: '10px', color: '#fff', backgroundColor: '#8A2B2B', padding: '1px 5px', borderRadius: '3px' }}>两宋</span>
        </div>
      ),
      content: (
        <div style={{ fontSize: '13px', lineHeight: '1.8', color: '#6B675B', textAlign: 'justify', padding: '6px 0' }}>
          <p style={{ margin: '0 0 8px' }}>
            本方天地秉持两宋美学雅意，集器物物溯考证、知音古今书札长谈、历代诗笺赏析与日月墨境切换于一体。
          </p>
          <p style={{ margin: '0', color: '#8A2B2B', fontWeight: 500 }}>
            版本：v2.0 崇雅版 · 谨向千古文脉致敬
          </p>
        </div>
      ),
      confirmText: '知悉'
    })
  }

  return (
    <div className='shuzhai-root'>
      {/* 1. 顶部水墨意境题头 */}
      <header className='shuzhai-header'>
        <ThemeToggle className='shuzhai-header__theme' />
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

        {/* 四列修持数据看板（支持快捷下钻） */}
        <p className='scholar-motto'>飞花修持积分：{userInfo.merit_points ?? 0}</p>
        <div className='scholar-stats'>
          {stats.map((item, idx) => (
            <div key={idx} className='scholar-stats__item' onClick={item.onClick}>
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

          <div className='shuzhai-list-item' onClick={() => setVisibleYayanDrawer(true)}>
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
              <span className='shuzhai-list-item__desc'>
                当前为：<span className='shuzhai-theme-badge'>{isDark ? '月' : '日'}</span> {isDark ? '月下墨境（暗色）' : '晓色晨宣（浅色）'}
              </span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>

          <div className='shuzhai-list-item' onClick={() => navigate('/accountSetting')}>
            <i className='iconfont icon-zhanghao'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>账号设置</span>
              <span className='shuzhai-list-item__desc'>头像换新、修改昵称与账号管理</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>

          {/* 墨色雅意快捷切换 */}
          <div className='shuzhai-list-item shuzhai-list-item--theme'>
            <i className='iconfont icon-shezhi'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>墨色雅意</span>
              <span className='shuzhai-list-item__desc'>晓色晨宣 / 月下墨境切换</span>
            </div>
            <ThemeToggle className='shuzhai-theme-toggle' />
          </div>

          <div className='shuzhai-list-item' onClick={() => navigate('/accountSetting')}>
            <i className='iconfont icon-suo'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>隐私与安全</span>
              <span className='shuzhai-list-item__desc'>修改密码与雅士名帖印章保护</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>

          <div className='shuzhai-list-item' onClick={() => {
            const next = !notifyEnabled
            setNotifyEnabled(next)
            Toast.show({ content: next ? '岁时节气与知音回信通知已开启' : '岁时通知已静息', icon: 'success' })
          }}>
            <i className='iconfont icon-tongzhi'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>消息通知</span>
              <span className='shuzhai-list-item__desc'>
                {notifyEnabled ? '岁时节气与知音回信提醒（已开启）' : '岁时节气与知音回信提醒（已静息）'}
              </span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </div>

          <div className='shuzhai-list-item' onClick={handleShowAbout}>
            <i className='iconfont icon-wenhao-yuankuang'></i>
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>关于云山竹简</span>
              <span className='shuzhai-list-item__desc'>国风两宋美学研习平台 · v2.0 崇雅版</span>
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
        image={userInfo.avatar || `${BASE}assets/shuzhai/avatar_yunshan.png`}
        visible={visibleAvatarViewer}
        onClose={() => setVisibleAvatarViewer(false)}
      />

      {/* 📜 雅译锦囊专属研习抽屉 */}
      <Popup
        visible={visibleYayanDrawer}
        position='bottom'
        onClose={() => setVisibleYayanDrawer(false)}
        className='yayan-popup'
      >
        <div className='yayan-box'>
          <div className='yayan-box__header'>
            <div className='yayan-box__title'>
              <span>雅译锦囊</span>
              <span className='yayan-box__seal'>两宋白话</span>
            </div>
            <div className='yayan-box__close' onClick={() => setVisibleYayanDrawer(false)}>✕</div>
          </div>
          <p className='yayan-box__sub'>
            收录两宋市井与文人日常白话雅言对照，随取随用，感受千年鲜活墨香。
          </p>
          <div className='yayan-box__list'>
            {PRESET_YAYAN.map((item, idx) => (
              <div key={idx} className='yayan-box__item'>
                <div className='yayan-box__content'>
                  <div className='yayan-box__ancient'>「{item.ancient}」</div>
                  <div className='yayan-box__modern'>释义：{item.modern} · <span style={{ opacity: 0.8 }}>{item.note}</span></div>
                </div>
                <button
                  className='yayan-box__copy-btn'
                  onClick={() => handleCopyYayan(item.ancient)}
                >
                  取用
                </button>
              </div>
            ))}
          </div>
        </div>
      </Popup>
    </div>
  )
}