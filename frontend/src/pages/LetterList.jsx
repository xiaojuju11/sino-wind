import { useScholarScope } from '../utils/useScholarScope'
import ReferenceCorners from '../components/ReferenceCorners'
import React, { useState, useEffect } from 'react'
import '../styles/letterList.less'
import { useNavigate } from 'react-router-dom'
import { AddOutline, SearchOutline, CloseOutline } from 'antd-mobile-icons'
import InviteDrawer from '../components/InviteDrawer'
import { cachedLetters, loadLetters, shichen } from '../utils/scholarLetters'
import InkWashBackground from '../components/InkWashBackground'
import '../styles/referencePolish.less'
import { getScholarScene } from '../utils/scholarScenes'

const BASE = import.meta.env.BASE_URL

// 经典预置先贤与信札
const PRESET_CONVERSATIONS = [
  {
    id: 'libai',
    name: '李白',
    title: '谪仙人',
    dynasty: '唐',
    avatar: `${BASE}assets/guancang/sage_libai.png`,
    status: '把酒对月中'
  },
  {
    id: 'group_zhulin',
    name: '竹林雅集 · 群聊',
    title: '魏晋名士',
    dynasty: '群',
    avatar: `${BASE}assets/guancang/scroll_changhe.png`,
    status: '雅士齐聚'
  },
  {
    id: 'sushi',
    name: '苏轼',
    title: '东坡居士',
    dynasty: '宋',
    avatar: `${BASE}assets/guancang/sage_sushi.png`,
    status: '烹茶赋词'
  },
  {
    id: 'liqingzhao',
    name: '李清照',
    title: '易安居士',
    dynasty: '宋',
    avatar: `${BASE}assets/guancang/sage_liqingzhao.png`,
    status: '倚栏校词'
  },
  {
    id: 'dufu',
    name: '杜甫',
    title: '少陵野老',
    dynasty: '唐',
    avatar: `${BASE}assets/guancang/sage_wangyangming.png`,
    status: '掩卷沉思'
  },
  {
    id: 'wangyangming', name: '王阳明', title: '阳明先生', dynasty: '明',
    avatar: `${BASE}assets/guancang/sage_wangyangming.png`, status: '心学悟道中'
  },
  {
    id: 'xinqiji',
    name: '辛弃疾',
    title: '稼轩居士',
    dynasty: '宋',
    avatar: `${BASE}assets/guancang/sage_libai.png`,
    status: '挑灯看剑'
  }
]

function LetterListSession() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('gufeng_custom_sages') || '[]')
      return [...(Array.isArray(saved) ? saved.filter(item => !PRESET_CONVERSATIONS.some(p => p.id === item.id)).map(item => ({ ...item, avatar: item.avatar || `${BASE}assets/guancang/sage_wangyangming.png`, status: item.status || '神游相候' })) : []), ...PRESET_CONVERSATIONS]
    } catch { return PRESET_CONVERSATIONS }
  })
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [letters, setLetters] = useState(cachedLetters)
  const [searchOpen, setSearchOpen] = useState(false), [searchText, setSearchText] = useState('')
  useEffect(() => {
    let current = true
    const refresh = () => loadLetters().then(rows => { if (current) setLetters(rows) })
      .catch(() => { if (current) setLetters(cachedLetters()) })
    const local = () => { if (current) setLetters(cachedLetters()) }
    refresh()
    const timer = setTimeout(refresh, 1200)
    window.addEventListener('focus', refresh); window.addEventListener('storage', local); window.addEventListener('scholarLettersUpdated', local)
    return () => { current = false; clearTimeout(timer); window.removeEventListener('focus', refresh); window.removeEventListener('storage', local); window.removeEventListener('scholarLettersUpdated', local) }
  }, [])
  const historical = letters.filter(row => !conversations.some(item => item.id === row.sageId) && (row.rounds > 0 || row.lastMsg)).map(row => ({ id: row.sageId, name: '自定知音', title: row.sageId, dynasty: '旧', avatar: `${BASE}assets/guancang/sage_wangyangming.png` }))
  const displayed = [...conversations, ...historical].map(item => {
    const row = letters.find(l => l.sageId === item.id)
    return { ...item, lastMsg: row?.reply?.unread ? `知音回柬：${row.reply.text}` : row?.lastMsg || '尚未对席，展卷与先贤初叙', time: shichen(row?.reply?.unread ? row.reply.at : row?.at), unread: row?.reply?.unread ? 1 : 0, at: Math.max(row?.at || 0, row?.reply?.at || 0) }
  }).filter(item => `${item.name} ${item.title} ${item.lastMsg}`.includes(searchText.trim())).sort((a, b) => b.at - a.at)

  // 迎请新友成功回调
  const handleInviteSuccess = (newSage) => {
    const formatted = {
      ...newSage,
      avatar: newSage.avatar || `${BASE}assets/guancang/sage_wangyangming.png`,
      status: '新交对席'
    }
    setConversations((prev) => [formatted, ...prev])
  }

  // 点击知己进入沉浸对话
  const handleGoChat = (item) => {
    navigate(`/chat/${item.id}`, { state: { sage: item } })
  }

  return (
    <div className="letter-root reference-polish">
      <InkWashBackground />
      {/* 1. 顶部水墨意境题头 */}
      <header className="letter-header">
        <button className='letter-header__search' type='button' onClick={() => { setSearchOpen(v => !v); setSearchText('') }} aria-label='检索知音' aria-expanded={searchOpen}><SearchOutline /></button>
        <div className="letter-header__title-wrap">
          <h1 className="letter-header__title">知己信札</h1>
          <span className="letter-header__seal">华风</span>
        </div>
        <p className="letter-header__subtitle">云笺素字 · 与千载知音烹茶对坐</p>
      </header>
      {searchOpen && <div className='letter-reference-search'><input aria-label='检索知音姓名或信札' value={searchText} onChange={e => setSearchText(e.target.value)} placeholder='检索知音姓名或信札' /><button type='button' aria-label='清空检索' onClick={() => setSearchText('')}><CloseOutline /></button></div>}

      {/* 2. 顶部水平知己画卷（横向滑动 + 迎请新友按钮） */}
      <section className="letter-gallery-section">
        <div className="letter-gallery-scroll">
          {displayed.filter(item => item.id !== 'group_zhulin').slice(0, 4).map((item) => {
            const scene = getScholarScene(item.id, item.name)
            return (
            <button type='button'
              key={item.id}
              className="letter-gallery-item"
              aria-label={`与${item.name}对席`}
              onClick={() => handleGoChat(item)}
            >
              <div className="letter-gallery-avatar-box">
                <span className='letter-portrait-window'>
                <img src={scene?.face ? scene.src : item.avatar} alt={item.name} className={`letter-gallery-avatar${scene?.face ? ' reference-sage-portrait' : ''}`}
                  style={scene?.face ? { '--face-left': `${50 - scene.face[0] * 800}%`, '--face-top': `${50 - scene.face[1] * 1600}%` } : undefined} />
                </span>
                {item.unread > 0 && (
                  <span className="letter-unread-badge" aria-label='有未读回柬'>1</span>
                )}
              </div>
              <span className="letter-gallery-name">{item.name.split('·')[0]}</span>
            </button>
          )})}

          {/* 迎请新友 (+) 按钮 */}
          <button type='button'
            className="letter-gallery-item letter-gallery-item--invite"
            aria-label='迎请新友'
            onClick={() => setDrawerVisible(true)}
          >
            <div className="letter-gallery-avatar-box letter-gallery-avatar-box--add">
              <AddOutline className="letter-add-icon" />
            </div>
            <span className="letter-gallery-name">迎请新友</span>
          </button>
        </div>
      </section>

      {/* 3. 信札往还列表 */}
      <section className="letter-list-section">
        <ReferenceCorners />
        <div className="letter-list-header">
          <span className="letter-list-title">尺素往来（{conversations.length} 席）</span>
          <span className="letter-list-tip">点击展开长谈</span>
        </div>

        <div className="letter-list">
          {displayed.map((item) => {
            const scene = getScholarScene(item.id, item.name)
            return (
            <div
              key={item.id}
              className="letter-card"
              data-group={item.id === 'group_zhulin' || undefined}
              onClick={() => handleGoChat(item)}
            >
              <div className="letter-card__avatar-wrap">
                <img src={scene?.src || item.avatar} alt={item.name} loading='lazy' className={`letter-card__avatar${scene?.face ? ' reference-sage-portrait' : ''}`}
                  style={scene?.face ? { '--face-left': `${50 - scene.face[0] * 800}%`, '--face-top': `${50 - scene.face[1] * 1600}%` } : undefined} />
                <span className="letter-card__dynasty">{item.dynasty}</span>
              </div>

              <div className="letter-card__body">
                <div className="letter-card__top">
                  <div className="letter-card__names">
                    <span className="letter-card__name">{item.id === 'group_zhulin' ? '竹林雅集' : item.name}</span>
                    <span className="letter-card__title">{item.id === 'group_zhulin' ? '群聊' : `· ${item.title}`}</span>
                  </div>
                  <span className="letter-card__time">{item.time}</span>
                </div>

                <div className="letter-card__bottom">
                  <p className="letter-card__snippet">{item.lastMsg}</p>
                  {item.unread > 0 && (
                    <span className="letter-card__badge">{item.unread}</span>
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>
      </section>

      {/* 迎请新友抽屉 */}
      <InviteDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onInviteSuccess={handleInviteSuccess}
      />
    </div>
  )
}

export default function LetterList() {
  const scope = useScholarScope()
  return <LetterListSession key={scope} />
}
