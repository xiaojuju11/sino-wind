import { useScholarScope } from '../utils/useScholarScope'
import ReferenceCorners from '../components/ReferenceCorners'
import React, { useState, useEffect, useRef } from 'react'
import '../styles/minePage.less'
import { ActionSheet, Toast, ImageViewer, Popup, Modal } from 'antd-mobile'
import { RightOutline, CloseOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../context/ThemeToggle.jsx'
import axios from '../http'
import ScholarArchive from '../components/ScholarArchive'
import ScholarArtifactDrawer from '../components/ScholarArtifactDrawer'
import InkWashBackground from '../components/InkWashBackground'
import '../styles/referencePolish.less'

import { scholarScope, syncLocalLetters, cachedLetters, loadLetters, shichen } from '../utils/scholarLetters'
import { guestSummary, guestArchiveCount, importGuestArchive, guestGames } from '../utils/scholarAssets'

import { readYayanNotebook, finishShuzhaiSession, unreadReplyCount } from '../utils/shuzhaiFlow'
import '../styles/shuzhaiFlow.less'

const BASE = import.meta.env.BASE_URL

const SAGE_NAMES = { libai: '李白', sushi: '苏轼', liqingzhao: '李清照', dufu: '杜甫', wangyangming: '王阳明', xinqiji: '辛弃疾', group_zhulin: '竹林雅集' }

function MinePageSession() {
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState({})
  const [rankData, setRankData] = useState(null)
  const [assetNotice, setAssetNotice] = useState('')
  const [guestCount, setGuestCount] = useState(guestArchiveCount)
  const [importing, setImporting] = useState(false)
  const refreshAssets = useRef(() => {})
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [artifactsOpen, setArtifactsOpen] = useState(false)
  const [visibleLogout, setVisibleLogout] = useState(false)
  const [visibleAvatarViewer, setVisibleAvatarViewer] = useState(false)
  const [visibleYayanDrawer, setVisibleYayanDrawer] = useState(false)
  const [notebook, setNotebook] = useState(readYayanNotebook)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [letters, setLetters] = useState(cachedLetters)
  const [inboxBusy, setInboxBusy] = useState(false)
  const [inboxNotice, setInboxNotice] = useState('')
  const refreshInbox = useRef(() => {})
  const signedIn = scholarScope().startsWith('user:')

  // Display real assets only. A failed request never becomes a mock statistic.
  useEffect(() => {
    let alive = true, generation = 0, timer
    const fetchInfo = async () => {
      const current = ++generation, scope = scholarScope()
      const valid = () => alive && current === generation && scope === scholarScope()
      setGuestCount(guestArchiveCount())
      if (!scope.startsWith('user:')) {
        setUserInfo(guestSummary()); setRankData(null); setAssetNotice('游客记录仅保留本机；登录后可确认收入本人账户，竞技积分以服务器结算为准。')
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
      setAssetNotice(results.some(r => r.status === 'rejected') ? '部分修持档案尚未载入，请重试。' : '')
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
    try { await importGuestArchive(); setAssetNotice('本机游客信札与藏品已收入当前账户；不兑换竞技积分。'); refreshAssets.current() }
    catch (error) { setAssetNotice(error.message || '补传未完成，本机原稿保留，请重试') }
    finally { setImporting(false); setGuestCount(guestArchiveCount()) }
  }

  useEffect(() => {
    let current = true, generation = 0
    const scope = scholarScope()
    const refresh = async () => {
      const version = ++generation
      setInboxBusy(true)
      try {
        const rows = await loadLetters()
        if (current && version === generation && scope === scholarScope()) { setLetters(rows); setInboxNotice('') }
      } catch {
        if (current && version === generation && scope === scholarScope()) { setLetters(cachedLetters()); setInboxNotice('云端回柬暂未载入，当前展示本机已存记录') }
      } finally { if (current && version === generation) setInboxBusy(false) }
    }
    const local = () => { if (current) setLetters(cachedLetters()) }
    const notebookChanged = () => { if (current) { setNotebook(readYayanNotebook()); local() } }
    refreshInbox.current = refresh
    refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('scholarLettersUpdated', local)
    window.addEventListener('storage', notebookChanged)
    return () => { current = false; generation++; window.removeEventListener('focus', refresh); window.removeEventListener('scholarLettersUpdated', local); window.removeEventListener('storage', notebookChanged) }
  }, [])
  const openNotebook = () => { setNotebook(readYayanNotebook()); setVisibleYayanDrawer(true) }
  const openAccount = () => {
    if (!signedIn) { Toast.show({ content: '请先入席，再管理个人账号' }); navigate('/login'); return }
    navigate('/accountSetting')
  }
  const openPoems = () => {
    if (!signedIn) { Toast.show({ content: '登录后可查看本人的诗笺收藏' }); navigate('/login'); return }
    navigate('/poem-collection')
  }

  // 退出登录操作选项
  const logoutActions = [
    { text: '整装离席（确认退出）', key: 'confirm', danger: true }
  ]

  const handleLogoutAction = (action) => {
    if (action.key === 'confirm') {
      setVisibleLogout(false)
      try {
        finishShuzhaiSession()
        Toast.show({ content: '已整装离席，藏品与信札妥善保留', icon: 'success' })
        navigate('/login', { replace: true })
      } catch { Toast.show({ content: '离席尚未完成，请重试' }) }
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
      onClick: () => setArtifactsOpen(true)
    },
    {
      num: userInfo.poem_count ?? '—',
      label: '诗词温故',
      onClick: openPoems
    },
    {
      num: userInfo.debate_count ?? '—',
      label: '知音鸿雁',
      onClick: () => navigate('/letters')
    },
    {
      num: userInfo.yayan_count ?? '—',
      label: '雅言研习',
      onClick: openNotebook
    },
  ]

  stats.push({ num: rankData?.total ?? (scholarScope() === 'guest' ? guestGames().length : '—'), label: '飞花归档', onClick: () => setArchiveOpen(true) })

  // Clipboard may be absent or blocked; keep a selectable fallback instead of false success.
  const handleCopyYayan = async (text) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
      Toast.show({ content: '雅言已复制', icon: 'success' })
    } catch {
      Modal.show({ title: '长按文字取用', content: <textarea className='shuzhai-flow-copy' aria-label='可手动复制的雅言' readOnly value={text} onFocus={event => event.currentTarget.select()} />, closeOnAction: true, actions: [{ key: 'close', text: '收好' }] })
    }
  }

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
              </span>
            </div>
            <p className='scholar-motto'>读千年风雅 与君共此山河</p>
          </div>
        </div>

        {/* 四列修持数据看板（支持快捷下钻） */}
        <p className='scholar-motto'>飞花修持积分：{rankData?.meritPoints ?? (scholarScope() === 'guest' ? 0 : '—')} · 宝鉴藏品：{userInfo.artifact_count ?? '—'}</p>
        {assetNotice && <p className='scholar-motto' role='status'>{assetNotice}</p>}
        {scholarScope().startsWith('user:') && <button type='button' onClick={() => refreshAssets.current()}>刷新修持档案</button>}
        {scholarScope().startsWith('user:') && guestCount > 0 && <button type='button' disabled={importing} onClick={importGuest}>{importing ? '收入中…' : `确认将本机游客的${guestCount}份信札/藏品收入当前账户`}</button>}
        <div className='scholar-stats'>
          {stats.map((item, idx) => (
            <button type='button' key={idx} className='scholar-stats__item' onClick={item.onClick}>
              <div className='scholar-stats__num'>{item.num}</div>
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
          <button type='button' className='shuzhai-list-item' onClick={() => setArchiveOpen(true)} style={{ width: '100%', background: 'var(--gf-bg-card)', color: 'var(--gf-ink-primary)', border: 0, textAlign: 'start' }}>
            <i className='iconfont icon-shuben' aria-hidden='true' />
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>藏牒阁（通关诏书）</span>
              <span className='shuzhai-list-item__desc'>历局唱和存卷 · 高清文牒回看与分享</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </button>
          <button type='button' className='shuzhai-list-item' onClick={() => setArtifactsOpen(true)}>
            <i className='iconfont icon-zhanpin' aria-hidden='true' />
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>物溯宝鉴（已鉴藏品）</span>
              <span className='shuzhai-list-item__desc'>已考证之今物与古器原型</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </button>

          <button type='button' className='shuzhai-list-item' onClick={openPoems}>
            <i className='iconfont icon-shoucang' aria-hidden='true' />
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>我的诗笺</span>
              <span className='shuzhai-list-item__desc'>收录的古诗词与摘录笔记</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </button>

          <button type='button' className='shuzhai-list-item' onClick={() => navigate('/letters')}>
            <i className='iconfont icon-message' aria-hidden='true' />
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>知音鸿雁（往来信札）</span>
              <span className='shuzhai-list-item__desc'>与李白、苏轼等千古知己交谈归档</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </button>

          <button type='button' className='shuzhai-list-item' onClick={openNotebook}>
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
          {/* 说明：此处原有「日月交替（墨境切换）」整行，与下方「墨色雅意」功能完全重复
              （同一 theme 状态、同一 toggleTheme），且用的是通知铃铛图标、语义不符。
              按要求只保留「墨色雅意」作为唯一的日月切换入口。 */}

          <button type='button' className='shuzhai-list-item' onClick={openAccount}>
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

          <button type='button' className='shuzhai-list-item' onClick={() => { setInboxOpen(true); refreshInbox.current() }}>
            <i className='iconfont icon-tongzhi' aria-hidden='true' />
            <div className='shuzhai-list-item__content'>
              <span className='shuzhai-list-item__title'>消息通知</span>
              <span className='shuzhai-list-item__desc'>{unreadReplyCount(letters) ? `${unreadReplyCount(letters)}封未读回柬 · 展读知音来信` : '展读知音回柬与往来书札'}</span>
            </div>
            <RightOutline className='shuzhai-list-item__arrow' />
          </button>

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
          <span className='shuzhai-logout-btn__seal' aria-hidden='true'>{signedIn ? '离席' : '入席'}</span>
          <span className='shuzhai-logout-btn__text'>{signedIn ? '整装离席 · 束卷归隐' : '登录入席 · 留存风雅'}</span>
        </button>
        <p className='shuzhai-logout-sub'>{signedIn ? '青山不改 · 藏品与信札妥善保留' : '入席后同步本人藏品、诗笺与修持'}</p>
      </div>

      {archiveOpen && <ScholarArchive onClose={() => setArchiveOpen(false)} />}
      {artifactsOpen && <ScholarArtifactDrawer onClose={() => setArtifactsOpen(false)} />}
      {/* 退出登录确认弹窗 */}
      <ActionSheet
        visible={visibleLogout}
        actions={logoutActions}
        extra='仅退出当前账号，云端资产与本机待同步原稿均保留。'
        cancelText='留步细品'
        onClose={() => setVisibleLogout(false)}
        onAction={handleLogoutAction}
      />

      <Popup visible={inboxOpen} position='bottom' onMaskClick={() => setInboxOpen(false)} onClose={() => setInboxOpen(false)} className='yayan-popup'>
        <section className='yayan-box' aria-label='书斋回柬中枢'>
          <header className='yayan-box__header'><h2 className='yayan-box__title'>知音回柬</h2><button type='button' className='yayan-box__close' aria-label='收起知音回柬' onClick={() => setInboxOpen(false)}><CloseOutline /></button></header>
          <p>这里展读站内留柬，不代表已开启浏览器或系统推送。</p>
          {inboxNotice && <p role='status'>{inboxNotice}</p>}
          {inboxBusy && <p role='status'>飞鸽寻笺中…</p>}
          <button type='button' className='shuzhai-flow-refresh' disabled={inboxBusy} onClick={() => refreshInbox.current()}>刷新来信</button>
          {!inboxBusy && !letters.some(row => row.reply) && <div className='shuzhai-flow-empty'><p>暂未收到回柬，与先贤完成四轮对席后离席，可收到一封留柬。</p><button type='button' onClick={() => { setInboxOpen(false); navigate('/letters') }}>前往知音对席</button></div>}
          {letters.filter(row => row.reply).sort((a, b) => b.reply.at - a.reply.at).map(row => <article className='yayan-box__item' key={row.sageId}>
            <div className='yayan-box__content'><h3>{SAGE_NAMES[row.sageId] || row.sageId} · {row.reply.unread ? '未读' : '已阅'}</h3><p>{row.reply.text}</p><small>{shichen(row.reply.at)} · {row.reply.kind}</small></div>
            <button type='button' className='yayan-box__copy-btn' onClick={() => { setInboxOpen(false); navigate(`/chat/${encodeURIComponent(row.sageId)}`) }}>展笺续谈</button>
          </article>)}
        </section>
      </Popup>

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
        onMaskClick={() => setVisibleYayanDrawer(false)}
        onClose={() => setVisibleYayanDrawer(false)}
        className='yayan-popup'
      >
        <div className='yayan-box'>
          <div className='yayan-box__header'>
            <div className='yayan-box__title'>
              <span>雅译锦囊</span>
              <span className='yayan-box__seal'>本机摘录</span>
            </div>
            <button type='button' className='yayan-box__close' aria-label='关闭雅译锦囊' onClick={() => setVisibleYayanDrawer(false)}><CloseOutline /></button>
          </div>
          <p className='yayan-box__sub'>
            展读首页“摘录入卷”留下的雅言。本机记录由此浏览器保存，尚未同步到个人云端。
          </p>
          <div className='yayan-box__list'>
            {notebook.error && <p role='status'>{notebook.error}</p>}
            {!notebook.error && notebook.records.length === 0 && <div className='shuzhai-flow-empty'><p>墨卷尚空，去雅集译一句，再点“摘录入卷”即可在此展读。</p><button type='button' onClick={() => { setVisibleYayanDrawer(false); navigate('/home') }}>前往雅集摘录</button></div>}
            <button type='button' className='shuzhai-flow-refresh' onClick={() => setNotebook(readYayanNotebook())}>刷新本机摘录</button>
            {notebook.records.map(item => (
              <div key={item.key} className='yayan-box__item'>
                <div className='yayan-box__content'>
                  <div className='yayan-box__ancient'>「{item.ancient}」</div>
                  <div className='yayan-box__modern'>白话：{item.modern || '未附白话原文'}{item.explanation && <p>{item.explanation}</p>}<small>{item.offline ? '离线典范摘录' : '雅言摘录'}{item.author ? ` · ${item.author}` : ''}{item.createdAt ? ` · ${item.createdAt}` : ''}</small></div>
                </div>
                <button
                  type='button'
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

export default function MinePage() {
  const scope = useScholarScope()
  return <MinePageSession key={scope} />
}
