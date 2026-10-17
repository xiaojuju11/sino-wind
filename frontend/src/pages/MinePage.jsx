import { useScholarScope } from '../utils/useScholarScope'
import ReferenceCorners from '../components/ReferenceCorners'
import React, { useState, useEffect, useRef } from 'react'
import '../styles/minePage.less'
import { ActionSheet, Toast, ImageViewer, Modal } from 'antd-mobile'
import { RightOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../context/ThemeToggle.jsx'
import axios from '../http'
import InkWashBackground from '../components/InkWashBackground'
import '../styles/referencePolish.less'
import '../styles/studyPages.less'
import { finishStudySession } from '../utils/studyFlow'

import { scholarScope, syncLocalLetters } from '../utils/scholarLetters'
import { guestSummary, guestArchiveCount, importGuestArchive, guestGames } from '../utils/scholarAssets'

const BASE = import.meta.env.BASE_URL

function MinePageSession() {
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState({})
  const [rankData, setRankData] = useState(null)
  const [guestCount, setGuestCount] = useState(guestArchiveCount)
  const [importing, setImporting] = useState(false)
  const refreshAssets = useRef(() => {})
  const [visibleLogout, setVisibleLogout] = useState(false)
  const [visibleAvatarViewer, setVisibleAvatarViewer] = useState(false)
  const signedIn = scholarScope().startsWith('user:')

  // Display real assets only. A failed request never becomes a mock statistic.
  useEffect(() => {
    let alive = true, generation = 0, timer
    const fetchInfo = async () => {
      const current = ++generation, scope = scholarScope()
      const valid = () => alive && current === generation && scope === scholarScope()
      setGuestCount(guestArchiveCount())
      if (!scope.startsWith('user:')) {
        setUserInfo(guestSummary()); setRankData(null)
        return
      }
      try { await syncLocalLetters() } catch { /* The summary may still be readable; local pending originals are retained. */ }
      if (!valid()) return
      const results = await Promise.allSettled([
        axios.get('/api/deepseek/scholar/summary', { timeout: 10000 }),
        axios.get('/api/deepseek/feihua/records', { params: { page: 1, pageSize: 1 }, timeout: 10000 })
      ])
      if (!valid()) return
      setUserInfo(results[0].status === 'fulfilled' ? results[0].value.data.data : {})
      setRankData(results[1].status === 'fulfilled' ? results[1].value.data.data : null)
      setGuestCount(guestArchiveCount())
    }
    const schedule = () => { clearTimeout(timer); timer = setTimeout(fetchInfo, 100) }
    refreshAssets.current = fetchInfo
    fetchInfo()
    for (const event of ['userInfoUpdated', 'scholarAssetsUpdated', 'focus', 'storage']) window.addEventListener(event, schedule)
    return () => { alive = false; generation++; clearTimeout(timer); for (const event of ['userInfoUpdated', 'scholarAssetsUpdated', 'focus', 'storage']) window.removeEventListener(event, schedule) }
  }, [])
  const importGuest = async () => {
    if (importing) return
    setImporting(true)
    try {
      await importGuestArchive()
      Toast.show({ content: '本机游客信札与藏品已收入当前账户', icon: 'success' })
      refreshAssets.current()
    } catch (error) {
      Toast.show({ content: error.message || '补传未完成，本机原稿保留，请重试' })
    } finally {
      setImporting(false)
      setGuestCount(guestArchiveCount())
    }
  }

  // 退出登录操作选项
  const logoutActions = [
    { text: '整装离席（确认退出）', key: 'confirm', danger: true }
  ]

  const handleLogoutAction = (action) => {
    if (action.key === 'confirm') {
      setVisibleLogout(false)
      try {
        finishStudySession()
        Toast.show({ content: '已整装离席，期君再聚', icon: 'success' })
        navigate('/login', { replace: true })
      } catch {
        Toast.show({ content: '暂未完成离席，请重试' })
      }
    }
  }

  // 主题切换唯一入口：「书斋清规 → 墨色雅意」行内的 ThemeToggle（共享组件自读 context）。
  // 原先此处还解构了 { theme, toggleTheme, isDark }，但 theme 从未被使用（ESLint 报错），
  // 而 toggleTheme / isDark 仅服务于已删除的「日月交替」重复行 —— 故一并清理。

  // Five asset sources; competitive records and ranks are read-only API results.
  const stats = [
    {
      num: userInfo.appraise_count ?? '—',
      label: '鉴宝印记',
      onClick: () => navigate('/mine/artifacts')
    },
    {
      num: userInfo.poem_count ?? '—',
      label: '诗词温故',
      onClick: () => navigate('/poem-collection')
    },
    {
      num: userInfo.debate_count ?? '—',
      label: '知音鸿雁',
      onClick: () => navigate('/mine/messages')
    },
    {
      num: userInfo.yayan_count ?? '—',
      label: '雅言研习',
      onClick: () => navigate('/mine/yayan')
    },
  ]

  stats.push({ num: rankData?.total ?? (scholarScope() === 'guest' ? guestGames().length : '—'), label: '飞花归档', onClick: () => navigate('/mine/archive') })

  // 关于弹窗
  // 说明：原用 Modal.alert，但其 ModalAlertProps 只接受 confirmText，无法给确认按钮传样式；
  // 故改用 Modal.show + 自定义 action（Action 支持 className/style），
  // 把「知悉」按钮统一为品牌朱砂 #8A2B2B。closeOnAction 保留「点按钮即关闭」的原行为。
  const handleShowAbout = () => {
    Modal.show({
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
      closeOnAction: true,
      actions: [
        {
          key: 'known',
          text: '知悉',
          // 底色沿用 Antd 默认白底（不设 background），保持与改动前一致；
          // 只做「椭圆胶囊 + 朱砂描边 + 朱砂字」，与书斋「整装离席」按钮同一套语汇。
          //
          // ⚠️ 为什么 padding 必须写在内联样式里（实测踩过）：
          // Antd 对非 primary 的 modal 按钮有
          //   `.adm-modal-footer .adm-modal-button:not(.adm-modal-button-primary) { padding-top: 0; padding-bottom: 0 }`
          // 这是【longhand】声明。CSS 层叠规则规定：同一元素上 longhand 与 shorthand 冲突时，
          // 无论优先级高低、源码顺序如何，**longhand 恒胜**（按属性名逐一比较）。
          // 所以样式表里写 `padding: 8px 32px` 永远覆盖不掉它 —— 实测上下 padding 始终为 0、
          // 按钮被压成一行字高（23.6px）。
          // 内联 style 是级联中最高一级，且 antd-mobile 会把它直接透传到 <button> 上，
          // 故用它来压住这两个 longhand；其余样式仍留在 .shuzhai-about-confirm 便于统一维护。
          style: { padding: '8px 32px' },
          className: 'shuzhai-about-confirm',
        },
      ],
    })
  }

  return (
    <div className='shuzhai-root reference-polish'>
      <InkWashBackground />
      {/* 1. 顶部水墨意境题头
          说明：题头右上角原有的 ThemeToggle 已按要求移除。
          日月切换在本书斋只保留「书斋清规 → 墨色雅意」一处入口，避免同页多个入口。 */}
      <header className='shuzhai-header'>
        <div className='shuzhai-header__title-wrap'>
          <h1 className='shuzhai-header__title'>墨隐书斋</h1>
          <span className='shuzhai-header__seal'>两宋</span>
        </div>
        <p className='shuzhai-header__subtitle'>一卷诗书藏风雅 半窗山水养心性</p>
      </header>

      {/* 2. 雅士身份大卡片 */}
      <section className='scholar-card'>
        <ReferenceCorners />
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
                {rankData?.rank || (scholarScope() === 'guest' ? '游客研习' : '文阶待载入')}
                {rankData?.meritPoints !== undefined && (
                  <span className='scholar-badge__points'>· {rankData.meritPoints}分</span>
                )}
              </span>
            </div>
            <p className='scholar-motto'>读千年风雅 与君共此山河</p>
          </div>
        </div>

        {/* 游客资产收录提示横幅（仅在存在未同步游客数据时呈现） */}
        {scholarScope().startsWith('user:') && guestCount > 0 && (
          <div className='scholar-guest-banner'>
            <span>检测到本机存有游客记录（{guestCount}份）</span>
            <button type='button' className='scholar-guest-banner__btn' disabled={importing} onClick={importGuest}>
              {importing ? '收入中…' : '收入账户'}
            </button>
          </div>
        )}

        {/* 五列修持数据看板（支持快捷下钻） */}
        <div className='scholar-stats'>
          {stats.map((item) => (
            <button key={item.label} type='button' className='scholar-stats__item' onClick={item.onClick}>
              <span className='scholar-stats__num'>{item.num}</span>
              <span className='scholar-stats__label'>{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. 列表卡片 1：五大藏品墨卷 */}
      <section className='shuzhai-section-card'>
        <ReferenceCorners />
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
          <button type='button' className='shuzhai-list-item' onClick={() => navigate('/mine/archive')}>
            <i className='iconfont icon-shuben' aria-hidden='true' />
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>藏牒阁</span>
              <span className='shuzhai-list-item__desc'>历局唱和存卷 · 高清文牒回看与分享</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </button>
          <button type='button' className='shuzhai-list-item' onClick={() => navigate('/mine/artifacts')}>
            <i className='iconfont icon-zhanpin' aria-hidden='true' />
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>物溯宝鉴</span>
              <span className='shuzhai-list-item__desc'>已考证之今物与古器原型</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </button>

          <button type='button' className='shuzhai-list-item' onClick={() => navigate('/poem-collection')}>
            <i className='iconfont icon-shoucang' aria-hidden='true' />
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>我的诗笺</span>
              <span className='shuzhai-list-item__desc'>收录的古诗词与摘录笔记</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </button>

          <button type='button' className='shuzhai-list-item' onClick={() => navigate('/mine/messages')}>
            <i className='iconfont icon-message' aria-hidden='true' />
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>知音回柬</span>
              <span className='shuzhai-list-item__desc'>展读千古知己往来信札与清谈回柬</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </button>

          <button type='button' className='shuzhai-list-item' onClick={() => navigate('/mine/yayan')}>
            <i className='iconfont icon-ziliao' aria-hidden='true' />
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>雅译锦囊</span>
              <span className='shuzhai-list-item__desc'>今人白话化两宋雅言之研习札记</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </button>
        </div>
      </section>

      {/* 4. 列表卡片 2：书斋清规 */}
      <section className='shuzhai-section-card'>
        <ReferenceCorners />
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
          <button type='button' className='shuzhai-list-item' onClick={() => navigate(signedIn ? '/accountSetting' : '/login')}>
            <i className='iconfont icon-zhanghao' aria-hidden='true' />
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>账号设置</span>
              <span className='shuzhai-list-item__desc'>头像换新、修改昵称与账号管理</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </button>

          {/* 墨色雅意：日月主题切换的唯一入口 */}
          <div className='shuzhai-list-item shuzhai-list-item--theme'>
            <i className='iconfont icon-shezhi' aria-hidden='true' />
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>墨色雅意</span>
              <span className='shuzhai-list-item__desc'>晓色晨宣 / 月下墨境切换</span>
            </div>
            <ThemeToggle className='shuzhai-theme-toggle' />
          </div>

          <button type='button' className='shuzhai-list-item' onClick={handleShowAbout}>
            <i className='iconfont icon-zhinan' aria-hidden='true' />
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>关于云山竹简</span>
              <span className='shuzhai-list-item__desc'>国风两宋美学研习平台 · v2.0 崇雅版</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </button>
        </div>
      </section>

      {/* 5. 整装离席退出按钮 */}
      <div className='shuzhai-logout-wrap'>
        <button
          type='button'
          className='shuzhai-logout-btn'
          onClick={() => signedIn ? setVisibleLogout(true) : navigate('/login')}
          aria-label={signedIn ? '整装离席' : '登录入席'}
        >
          <span className='shuzhai-logout-btn__ornaments' aria-hidden='true'>
            <span /><span /><span /><span />
          </span>
          <span className='shuzhai-logout-btn__text'>{signedIn ? '整装离席' : '登录入席'}<small>{signedIn ? '束卷归隐 · 期君再聚' : '落座留名 · 共此山河'}</small></span>
        </button>
        <p className='shuzhai-logout-sub'>{signedIn ? '藏卷仍在，风雅长留' : '入席后，可留存自己的风雅藏卷'}</p>
      </div>

      {/* 退出登录确认弹窗 */}
      <ActionSheet
        visible={visibleLogout}
        actions={logoutActions}
        cancelText='留步细品'
        extra='仅退出当前登录；藏品、信札、本机摘录与日月偏好均会保留。'
        onClose={() => setVisibleLogout(false)}
        onAction={handleLogoutAction}
      />

      {/* 头像大图查看器 */}
      <ImageViewer
        image={userInfo.avatar || `${BASE}assets/shuzhai/avatar_yunshan.png`}
        visible={visibleAvatarViewer}
        onClose={() => setVisibleAvatarViewer(false)}
      />

    </div>
  )
}

export default function MinePage() {
  const scope = useScholarScope()
  return <MinePageSession key={scope} />
}
