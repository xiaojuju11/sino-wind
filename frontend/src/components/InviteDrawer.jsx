import React, { useState } from 'react'
import { Popup, Toast } from 'antd-mobile'
import { CloseOutline, StarOutline } from 'antd-mobile-icons'
import axios from '../http'
import '../styles/referencePolish.less'

const BASE = import.meta.env.BASE_URL

// 先贤水墨立绘候选（解决 P5 无头像选择缺陷）
const AVATAR_PRESETS = [
  { id: 'libai', name: '太白立绘', src: `${BASE}assets/guancang/sage_libai.png` },
  { id: 'sushi', name: '东坡立绘', src: `${BASE}assets/guancang/sage_sushi.png` },
  { id: 'liqingzhao', name: '易安立绘', src: `${BASE}assets/guancang/sage_liqingzhao.png` },
  { id: 'wangyangming', name: '阳明立绘', src: `${BASE}assets/guancang/sage_wangyangming.png` },
  { id: 'zhulin', name: '魏晋长卷', src: `${BASE}assets/guancang/scroll_changhe.png` }
]

// 朝代快捷标签
const DYNASTY_OPTIONS = ['盛唐', '两宋', '魏晋', '先秦', '大明', '清代']

export default function InviteDrawer({ visible, onClose, onInviteSuccess }) {
  const [name, setName] = useState('')
  const [dynasty, setDynasty] = useState('两宋')
  const [avatar, setAvatar] = useState(AVATAR_PRESETS[3].src)
  const [title, setTitle] = useState('')
  const [welcome, setWelcome] = useState('')
  const [biography, setBiography] = useState('')
  const [tags, setTags] = useState([])
  const [loadingAi, setLoadingAi] = useState(false)

  // 推荐先贤快捷填入
  const quickScholars = ['辛弃疾', '纳兰性德', '陶渊明', '白居易', '李商隐', '王阳明']

  // AI 一键考释赋魂
  const handleAiSoul = async (targetName) => {
    const scholarName = targetName || name.trim()
    if (!scholarName) {
      Toast.show({ content: '请先挥毫输入先贤名号' })
      return
    }
    setLoadingAi(true)
    try {
      const res = await axios.post('/api/deepseek/soul', {
        name: scholarName,
        dynasty
      })
      if (res?.data?.data) {
        const soul = res.data.data
        setName(soul.name)
        setDynasty(soul.dynasty || dynasty)
        setTitle(soul.title || '名仕雅客')
        setWelcome(soul.welcome || `吾乃${soul.name}，幸会雅士。`)
        setBiography(soul.biography || '')
        setTags(soul.tags || [])
        // 根据文风智能匹配头像
        if (soul.name.includes('清照') || soul.tags?.includes('婉约')) {
          setAvatar(AVATAR_PRESETS[2].src)
        } else if (soul.name.includes('白') || soul.tags?.includes('豪放') || soul.tags?.includes('诗仙')) {
          setAvatar(AVATAR_PRESETS[0].src)
        } else if (soul.name.includes('轼') || soul.tags?.includes('东坡') || soul.tags?.includes('旷达')) {
          setAvatar(AVATAR_PRESETS[1].src)
        }
        Toast.show({ content: `已考释【${soul.name}】风骨生平`, icon: 'success' })
      }
    } catch {
      Toast.show({ content: '先贤墨迹未凝，已生成基础人设' })
      setTitle('诗坛名宿')
      setWelcome(`吾乃${scholarName}，且与君烹茶长谈。`)
    } finally {
      setLoadingAi(false)
    }
  }

  // 迎请入席确认
  const handleConfirmInvite = () => {
    if (!name.trim()) {
      Toast.show({ content: '请输入先贤姓名' })
      return
    }
    const id = `sage_${Date.now()}`
    const newSage = {
      id,
      name: name.trim(),
      title: title.trim() || '千古知己',
      dynasty,
      avatar,
      welcome: welcome.trim() || `吾乃${name}，幸与足下相逢于云山之境。`,
      biography,
      tags,
      prompt: `你现在就是${dynasty}名仕${name.trim()}本人。生平概览：${biography || '诗文传世，德高望重'}。你谈吐文雅典雅、半文半白、严格以第一人称对答，坚决保持${name.trim()}本人身份，绝不可自称AI助手或教育助手。`,
      unread: 0,
      lastMsg: welcome || '新友初至，且奉清茗一杯。',
      time: '刚刚'
    }

    try {
      const saved = JSON.parse(localStorage.getItem('gufeng_custom_sages') || '[]')
      saved.unshift(newSage)
      localStorage.setItem('gufeng_custom_sages', JSON.stringify(saved))
      Toast.show({ content: `已迎请【${name}】入席知音殿`, icon: 'success' })
      if (onInviteSuccess) onInviteSuccess(newSage)
      handleClose()
    } catch {
      Toast.show({ content: '迎请成功' })
    }
  }

  const handleClose = () => {
    setName('')
    setTitle('')
    setWelcome('')
    setBiography('')
    setTags([])
    setAvatar(AVATAR_PRESETS[3].src)
    onClose()
  }

  return (
    <Popup
      visible={visible}
      onMaskClick={handleClose}
      position="bottom"
      bodyStyle={{
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
        maxHeight: '88vh',
        background: 'var(--gf-bg-card, #FAF7F0)'
      }}
    >
      <div className="invite-drawer reference-invite">
        {/* 顶部标题栏 */}
        <div className="invite-drawer__header">
          <div className="invite-drawer__title-wrap">
            <span className="invite-drawer__seal">华风</span>
            <h3 className="invite-drawer__title">迎请故友 · 自定知己</h3>
          </div>
          <button type="button" className="invite-drawer__close" aria-label='离席，关闭邀请' onClick={handleClose}>
            <CloseOutline /><span>离席</span>
          </button>
        </div>

        {/* 内部平滑滚动容器（解决移动端软键盘弹起遮挡问题） */}
        <div className="invite-drawer__body">
          <p className="invite-drawer__sub">
            探幽发微 · 引经据典考辨名仕生平文风，与千载知己烹茶对席
          </p>

          {/* 快捷推荐点召 */}
          <div className="invite-drawer__quick">
            <span className="invite-drawer__quick-label">名仕点召：</span>
            <div className="invite-drawer__chips">
              {quickScholars.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="invite-drawer__chip"
                  onClick={() => {
                    setName(s)
                    handleAiSoul(s)
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* 立绘水墨印相选择 */}
          <div className="invite-drawer__avatar-section">
            <span className="invite-drawer__quick-label">水墨立绘印相：</span>
            <div className="invite-drawer__avatars">
              {AVATAR_PRESETS.map((p) => (
                <div
                  key={p.id}
                  className={`invite-drawer__avatar-opt ${avatar === p.src ? 'is-active' : ''}`}
                  onClick={() => setAvatar(p.src)}
                >
                  <img src={p.src} alt={p.name} />
                  <span className="invite-drawer__avatar-name">{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 表单区域 */}
          <div className="invite-drawer__form">
            <div className="invite-drawer__form-row">
              <label className="invite-drawer__label" htmlFor='invite-name'>诗人名号</label>
              <input
                id='invite-name'
                type="text"
                className="invite-drawer__input"
                placeholder="如：陶渊明、辛弃疾、纳兰性德"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* 朝代快捷选择 */}
            <div className="invite-drawer__form-row-dynasty">
              <label className="invite-drawer__label">所属朝代</label>
              <select aria-label='所属朝代' className='invite-drawer__dynasty-select' value={dynasty} onChange={event => setDynasty(event.target.value)}>{[...new Set([...DYNASTY_OPTIONS, dynasty])].map(d => <option key={d}>{d}</option>)}</select>
            </div>

            {/* 典籍考释赋神按钮 */}
            <button
              type="button"
              className="invite-drawer__ai-btn"
              disabled={loadingAi}
              onClick={() => handleAiSoul()}
            >
              <StarOutline aria-hidden='true' /> {loadingAi ? '研墨考辨风骨中…' : 'AI 一键考释赋魂'}
              <small>输入诗人名号，考释生平与文风；所得内容可编辑</small>
            </button>

            {/* 赋魂后生成的详情（纯净暖宣纸底，WCAG 高对比易读） */}
            {title && (
              <div className="invite-drawer__soul-card">
                <div className="invite-drawer__soul-title">
                  <span>头衔：【{title}】</span>
                  <span className="invite-drawer__soul-dynasty">{dynasty}</span>
                </div>
                {tags.length > 0 && (
                  <div className="invite-drawer__soul-tags">
                    {tags.map((t, idx) => (
                      <span key={idx} className="invite-drawer__soul-tag">#{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className='invite-drawer__form-row'><label className='invite-drawer__label' htmlFor='invite-biography'>生涯纪略</label><textarea id='invite-biography' className='invite-drawer__textarea' rows={3} placeholder='AI考释后自动填入，也可自行补写生平纪略' value={biography} onChange={e => setBiography(e.target.value)} /></div>

            <div className="invite-drawer__form-row">
              <label className="invite-drawer__label">初遇寄语：</label>
              <textarea
                className="invite-drawer__textarea"
                rows={2}
                placeholder="先贤与您初逢时的古风问候语..."
                value={welcome}
                onChange={(e) => setWelcome(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 底部吸底确认按钮 (绝对不被软键盘遮挡) */}
        <div className="invite-drawer__footer">
          <button
            type="button"
            className="invite-drawer__confirm-btn"
            onClick={handleConfirmInvite}
          >
            结为知己 · 迎入先贤席
          </button>
        </div>
      </div>
    </Popup>
  )
}
