import React, { useState } from 'react'
import { Popup, Toast } from 'antd-mobile'
import { CloseOutline } from 'antd-mobile-icons'
import axios from '../http'

export default function InviteDrawer({ visible, onClose, onInviteSuccess }) {
  const [name, setName] = useState('')
  const [dynasty, setDynasty] = useState('宋')
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
      welcome: welcome.trim() || `吾乃${name}，幸与足下相逢于云山之境。`,
      biography,
      tags,
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
        maxHeight: '85vh',
        background: 'var(--gf-bg-card, #FAF7F0)'
      }}
    >
      <div className="invite-drawer">
        {/* 顶部标题栏 */}
        <div className="invite-drawer__header">
          <div className="invite-drawer__title-wrap">
            <span className="invite-drawer__seal">迎新</span>
            <h3 className="invite-drawer__title">迎请新友 · 自定千古知己</h3>
          </div>
          <button type="button" className="invite-drawer__close" onClick={handleClose}>
            <CloseOutline />
          </button>
        </div>

        <p className="invite-drawer__sub">
          输入历史先贤名讳，AI 一键考释生平、文风流派并赋予对席神魂
        </p>

        {/* 快捷推荐 */}
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

        {/* 表单区域 */}
        <div className="invite-drawer__form">
          <div className="invite-drawer__form-row">
            <label className="invite-drawer__label">名号：</label>
            <input
              type="text"
              className="invite-drawer__input"
              placeholder="如：陶渊明、辛弃疾"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="invite-drawer__form-row">
            <label className="invite-drawer__label">朝代：</label>
            <input
              type="text"
              className="invite-drawer__input"
              placeholder="如：两宋、盛唐、魏晋"
              value={dynasty}
              onChange={(e) => setDynasty(e.target.value)}
            />
          </div>

          {/* AI 一键考释赋魂按钮 */}
          <button
            type="button"
            className="invite-drawer__ai-btn"
            disabled={loadingAi}
            onClick={() => handleAiSoul()}
          >
            {loadingAi ? 'AI 考释赋魂中…' : '✨ AI 一键考释赋魂'}
          </button>

          {/* 赋魂后生成的详情 */}
          {title && (
            <div className="invite-drawer__soul-card">
              <div className="invite-drawer__soul-title">
                <span>头衔：【{title}】</span>
                <span className="invite-drawer__soul-dynasty">{dynasty}代</span>
              </div>
              {tags.length > 0 && (
                <div className="invite-drawer__soul-tags">
                  {tags.map((t, idx) => (
                    <span key={idx} className="invite-drawer__soul-tag">#{t}</span>
                  ))}
                </div>
              )}
              {biography && (
                <p className="invite-drawer__soul-bio">{biography}</p>
              )}
            </div>
          )}

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

        {/* 底部确认按钮 */}
        <div className="invite-drawer__footer">
          <button
            type="button"
            className="invite-drawer__confirm-btn"
            onClick={handleConfirmInvite}
          >
            迎 请 入 席
          </button>
        </div>
      </div>
    </Popup>
  )
}
