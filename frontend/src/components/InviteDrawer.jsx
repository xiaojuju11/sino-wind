import React, { useState, useRef } from 'react'
import { Popup, Toast } from 'antd-mobile'
import { CloseOutline, StarOutline, PictureOutline, AddOutline } from 'antd-mobile-icons'
import axios from '../http'
import '../styles/referencePolish.less'

const BASE = import.meta.env.BASE_URL

// 先贤水墨立绘候选（支持经典与自定）
const AVATAR_PRESETS = [
  { id: 'libai', name: '太白立绘', src: `${BASE}assets/guancang/sage_libai.png` },
  { id: 'sushi', name: '东坡立绘', src: `${BASE}assets/guancang/sage_sushi.png` },
  { id: 'liqingzhao', name: '易安立绘', src: `${BASE}assets/guancang/sage_liqingzhao.png` },
  { id: 'wangyangming', name: '阳明立绘', src: `${BASE}assets/guancang/sage_wangyangming.png` },
  { id: 'zhulin', name: '魏晋长卷', src: `${BASE}assets/guancang/scroll_changhe.png` }
]

// 朝代与时空维度（覆盖古今文人与架空知己）
const DYNASTY_OPTIONS = ['两宋', '盛唐', '魏晋', '先秦', '大明', '清代', '现当代', '虚拟架空', '世界名士', '自定时空']

export default function InviteDrawer({ visible, onClose, onInviteSuccess }) {
  const [name, setName] = useState('')
  const [dynasty, setDynasty] = useState('两宋')
  const [customDynasty, setCustomDynasty] = useState('')
  const [avatar, setAvatar] = useState(AVATAR_PRESETS[3].src)
  const [uploadedAvatar, setUploadedAvatar] = useState('')
  const [title, setTitle] = useState('')
  const [welcome, setWelcome] = useState('')
  const [biography, setBiography] = useState('')
  const [tags, setTags] = useState([])
  const [loadingAi, setLoadingAi] = useState(false)
  const fileInputRef = useRef(null)

  // 推荐点召快捷填入（古今包容）
  const quickScholars = ['辛弃疾', '纳兰性德', '陶渊明', '林徽因', '鲁迅', '苏轼', '李白']

  // 本地相册/图片上传转码压缩（256x256，保障轻量与全端清晰）
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      Toast.show({ content: '请选取图片格式文件' })
      return
    }
    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const maxDim = 256
          let w = img.width
          let h = img.height
          if (w > h) {
            if (w > maxDim) {
              h = Math.round((h * maxDim) / w)
              w = maxDim
            }
          } else {
            if (h > maxDim) {
              w = Math.round((w * maxDim) / h)
              h = maxDim
            }
          }
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, w, h)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
          setAvatar(dataUrl)
          setUploadedAvatar(dataUrl)
          Toast.show({ content: '头像上传成功', icon: 'success' })
        } catch {
          setAvatar(loadEvent.target.result)
          setUploadedAvatar(loadEvent.target.result)
          Toast.show({ content: '头像已选定', icon: 'success' })
        }
      }
      img.src = loadEvent.target.result
    }
    reader.readAsDataURL(file)
  }

  // AI 一键考释赋魂（兼容历史文人、现代名家及虚拟好友）
  const handleAiSoul = async (targetName) => {
    const scholarName = targetName || name.trim()
    if (!scholarName) {
      Toast.show({ content: '请先挥毫输入知己名号' })
      return
    }
    setLoadingAi(true)
    const effectiveDynasty = dynasty === '自定时空' ? (customDynasty.trim() || '自定时空') : dynasty
    try {
      const res = await axios.post('/api/deepseek/soul', {
        name: scholarName,
        dynasty: effectiveDynasty
      })
      if (res?.data?.data) {
        const soul = res.data.data
        setName(soul.name)
        if (soul.dynasty) {
          if (DYNASTY_OPTIONS.includes(soul.dynasty)) {
            setDynasty(soul.dynasty)
          } else {
            setDynasty('自定时空')
            setCustomDynasty(soul.dynasty)
          }
        }
        setTitle(soul.title || '旷世知交')
        setWelcome(soul.welcome || `吾乃${soul.name}，幸会使君。`)
        setBiography(soul.biography || '')
        setTags(soul.tags || [])
        // 未自传头像时根据文风智能匹配预设头像
        if (!uploadedAvatar) {
          if (soul.name.includes('清照') || soul.tags?.includes('婉约')) {
            setAvatar(AVATAR_PRESETS[2].src)
          } else if (soul.name.includes('白') || soul.tags?.includes('豪放') || soul.tags?.includes('诗仙')) {
            setAvatar(AVATAR_PRESETS[0].src)
          } else if (soul.name.includes('轼') || soul.tags?.includes('东坡') || soul.tags?.includes('旷达')) {
            setAvatar(AVATAR_PRESETS[1].src)
          }
        }
        Toast.show({ content: `已考释【${soul.name}】风骨生平`, icon: 'success' })
      }
    } catch {
      Toast.show({ content: '已生成基础人设' })
      setTitle('旷世知己')
      setWelcome(`吾乃${scholarName}，且与君烹茶长谈。`)
    } finally {
      setLoadingAi(false)
    }
  }

  // 迎请入席确认
  const handleConfirmInvite = () => {
    if (!name.trim()) {
      Toast.show({ content: '请输入知己名号' })
      return
    }
    const effectiveDynasty = dynasty === '自定时空' ? (customDynasty.trim() || '自定时空') : dynasty
    const id = `sage_${Date.now()}`
    const newSage = {
      id,
      name: name.trim(),
      title: title.trim() || '旷世知己',
      dynasty: effectiveDynasty,
      avatar,
      welcome: welcome.trim() || `吾乃${name.trim()}，幸与足下相逢于云山之境。`,
      biography: biography.trim(),
      tags,
      prompt: `你现在就是${effectiveDynasty}名士${name.trim()}本人。生平概览：${biography.trim() || '诗文传世，德高望重'}。你谈吐文雅典雅、半文半白、严格以第一人称对答，坚决保持${name.trim()}本人身份，绝不可自称AI助手或教育助手。`,
      unread: 0,
      lastMsg: welcome.trim() || '新友初至，且奉清茗一杯。',
      time: '刚刚'
    }

    try {
      const saved = JSON.parse(localStorage.getItem('gufeng_custom_sages') || '[]')
      const filtered = Array.isArray(saved) ? saved.filter((item) => item && item.id !== id) : []
      filtered.unshift(newSage)
      localStorage.setItem('gufeng_custom_sages', JSON.stringify(filtered))
      Toast.show({ content: `已迎请【${name.trim()}】入席知音殿`, icon: 'success' })
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
    setDynasty('两宋')
    setCustomDynasty('')
    setUploadedAvatar('')
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
        maxHeight: '90vh',
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
          <button type="button" className="invite-drawer__close" aria-label="离席，关闭邀请" onClick={handleClose}>
            <CloseOutline /><span>离席</span>
          </button>
        </div>

        {/* 内部平滑滚动容器 */}
        <div className="invite-drawer__body">
          <p className="invite-drawer__sub">
            探幽发微 · 古今中外名士、虚拟知己或至交好友皆可对席烹茶长谈
          </p>

          {/* 知己印相与自定义头像上传（首屏直观展现，随点即换） */}
          <div className="invite-drawer__avatar-section">
            <div className="invite-drawer__avatar-preview-box">
              <div
                className="invite-drawer__avatar-current"
                onClick={() => fileInputRef.current?.click()}
                title="点击上传自定义头像"
                role="button"
                tabIndex={0}
              >
                <img src={avatar} alt="知己头像" />
                <span className="invite-drawer__avatar-tag">点击自定</span>
              </div>
              <div className="invite-drawer__avatar-meta">
                <span className="invite-drawer__quick-label">知己印相 · 头像定制</span>
                <p className="invite-drawer__avatar-hint">
                  支持上传自定义头像（现代好友/虚拟人物/挚友照片皆可），或点选水墨立绘
                </p>
                <button
                  type="button"
                  className="invite-drawer__upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <PictureOutline aria-hidden="true" />
                  <span>上传自定义头像</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="invite-drawer__avatars">
              {uploadedAvatar && (
                <div
                  className={`invite-drawer__avatar-opt ${avatar === uploadedAvatar ? 'is-active' : ''}`}
                  onClick={() => setAvatar(uploadedAvatar)}
                  role="button"
                  tabIndex={0}
                >
                  <img src={uploadedAvatar} alt="自定上传" />
                  <span className="invite-drawer__avatar-name">自定上传</span>
                </div>
              )}
              {AVATAR_PRESETS.map((p) => (
                <div
                  key={p.id}
                  className={`invite-drawer__avatar-opt ${avatar === p.src ? 'is-active' : ''}`}
                  onClick={() => setAvatar(p.src)}
                  role="button"
                  tabIndex={0}
                >
                  <img src={p.src} alt={p.name} />
                  <span className="invite-drawer__avatar-name">{p.name}</span>
                </div>
              ))}
            </div>
          </div>

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

          {/* 表单区域 */}
          <div className="invite-drawer__form">
            <div className="invite-drawer__form-row">
              <label className="invite-drawer__label" htmlFor="invite-name">知己名号 / 好友姓名</label>
              <input
                id="invite-name"
                type="text"
                className="invite-drawer__input"
                placeholder="如：陶渊明、林徽因、福尔摩斯、至交姓名（古今虚拟皆可）"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* 朝代/时空自由选择 */}
            <div className="invite-drawer__form-row-dynasty">
              <label className="invite-drawer__label" htmlFor="invite-dynasty">所属时空 / 朝代</label>
              <div className="invite-drawer__dynasty-wrap">
                <select
                  id="invite-dynasty"
                  aria-label="所属时空或朝代"
                  className="invite-drawer__dynasty-select"
                  value={dynasty}
                  onChange={(e) => setDynasty(e.target.value)}
                >
                  {DYNASTY_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {dynasty === '自定时空' && (
                  <input
                    type="text"
                    className="invite-drawer__input invite-drawer__input--custom-dynasty"
                    placeholder="请输入自定义时空/朝代（如：民国、赛博、贝克街）"
                    value={customDynasty}
                    maxLength={30}
                    onChange={(e) => setCustomDynasty(e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* 典籍考释赋神按钮 */}
            <button
              type="button"
              className="invite-drawer__ai-btn"
              disabled={loadingAi}
              onClick={() => handleAiSoul()}
            >
              <StarOutline aria-hidden="true" /> {loadingAi ? '研墨考辨风骨中…' : 'AI 一键考释赋魂'}
              <small>输入知己名号，考释生平与文风（古今虚拟皆支持）；所得内容可编辑</small>
            </button>

            {/* 赋魂后生成的详情 */}
            {title && (
              <div className="invite-drawer__soul-card">
                <div className="invite-drawer__soul-title">
                  <span>头衔：【{title}】</span>
                  <span className="invite-drawer__soul-dynasty">
                    {dynasty === '自定时空' ? (customDynasty || '自定时空') : dynasty}
                  </span>
                </div>
                {tags.length > 0 && (
                  <div className="invite-drawer__soul-tags">
                    {tags.map((t) => (
                      <span key={t} className="invite-drawer__soul-tag">#{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="invite-drawer__form-row">
              <label className="invite-drawer__label" htmlFor="invite-biography">生涯纪略</label>
              <textarea
                id="invite-biography"
                className="invite-drawer__textarea"
                rows={3}
                placeholder="AI考释后自动填入，也可自行撰写生平纪略或角色设定"
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
              />
            </div>

            <div className="invite-drawer__form-row">
              <label className="invite-drawer__label" htmlFor="invite-welcome">初遇寄语</label>
              <textarea
                id="invite-welcome"
                className="invite-drawer__textarea"
                rows={2}
                placeholder="知己与您初逢时的温雅问候语..."
                value={welcome}
                onChange={(e) => setWelcome(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 底部吸底确认按钮 */}
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
