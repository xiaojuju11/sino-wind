import React, { useState, useRef, useEffect } from 'react'
import '../styles/scholarChat.less'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { LeftOutline, SendOutline, SoundOutline } from 'antd-mobile-icons'
import { Toast, DotLoading } from 'antd-mobile'
import axios from '../http'

const BASE = import.meta.env.BASE_URL

// 预设知己英雄图谱与格言
const SAGE_HERO_MAP = {
  libai: {
    name: '李白',
    title: '谪仙人',
    motto: '人生得意须尽欢，莫使金樽空对月。',
    status: '把酒对月中',
    portrait: `${BASE}assets/guancang/sage_libai.png`,
    welcome: '吾乃青莲居士李太白。天生我材必有用，千金散尽还复来！来者何人，愿与吾金樽对饮否？',
    capsules: ['🍶 太白兄，何以解忧？', '🌙 今夕何夕，对月起舞', '✍️ 请与我同作五绝', '🍵 唐代煎茶与宋点茶有何异？']
  },
  sushi: {
    name: '苏轼',
    title: '东坡居士',
    motto: '一蓑烟雨任平生，也无风雨也无晴。',
    status: '烹茶赋词中',
    portrait: `${BASE}assets/guancang/sage_sushi.png`,
    welcome: '老夫苏子瞻，今日刚得新茶一瓮，并烹东坡肉。天下名山僧占多，且坐下与老夫闲话平生。',
    capsules: ['🥩 东坡肉秘法几何？', '🌧️ 遇逆境如何豁达自适？', '🍵 水光潋滟晴方好何意？', '🌿 黄州赤壁赋有何深意？']
  },
  liqingzhao: {
    name: '李清照',
    title: '易安居士',
    motto: '何须浅碧深红色，自是花中第一流。',
    status: '倚栏校词中',
    portrait: `${BASE}assets/guancang/sage_liqingzhao.png`,
    welcome: '易安居士见过来客。沉醉不知归路，误入藕花深处——君有新词，愿与妾身切磋一番？',
    capsules: ['🌸 易安词何以字字珠玑？', '📜 金石录后序背后故事', '🍷 三杯两盏淡酒何以销愁？', '🌧️ 梧桐更兼细雨之境']
  },
  group_zhulin: {
    name: '竹林雅集 · 群聊',
    title: '魏晋名士',
    motto: '广陵绝响，竹林清风。',
    status: '先贤同席',
    portrait: `${BASE}assets/guancang/scroll_changhe.png`,
    welcome: '嵇康：广陵散绝矣，诸君请入席。阮籍：青白眼待客，来者皆名士。向秀：且寄幽怀于山林！',
    capsules: ['🎶 广陵散何以绝世？', '🌿 何为魏晋风骨与名士？', '🍷 与竹林诸贤共饮一樽', '⛰️ 寄情山水之逍遥意']
  }
}

// 传统时辰格式化
function getShichenTime() {
  const hours = new Date().getHours()
  const shichenNames = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时']
  const idx = Math.floor(((hours + 1) % 24) / 2)
  return `${shichenNames[idx]}二刻`
}

export default function ScholarChat() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  // 匹配先贤元信息
  const sageKey = id || 'libai'
  const navSage = location.state?.sage
  const sageInfo = SAGE_HERO_MAP[sageKey] || {
    name: navSage?.name || '先贤雅士',
    title: navSage?.title || '千古知音',
    motto: '读千年风雅，与君共此山河。',
    status: '神交长谈中',
    portrait: navSage?.avatar || `${BASE}assets/guancang/sage_libai.png`,
    welcome: navSage?.welcome || '幸与足下相逢于云山竹简之境，且煮清茶以待君言。',
    capsules: ['📜 请与我畅谈经史子集', '🍵 茶道与修身之道', '🌿 如何保持内心宁静', '✍️ 作诗一首赠吾']
  }

  // 消息列表
  const [messages, setMessages] = useState([
    {
      id: 'msg_welcome',
      role: 'ai',
      content: sageInfo.welcome,
      time: getShichenTime()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const chatScrollRef = useRef(null)

  // 滚动到底部
  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: 'smooth'
    })
  }, [messages, loading])

  // 发送消息
  const handleSend = async (customContent) => {
    const text = (customContent || inputText).trim()
    if (!text || loading) return

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      time: getShichenTime()
    }

    setMessages((prev) => [...prev, userMsg])
    if (!customContent) setInputText('')
    setLoading(true)

    try {
      const res = await axios.post('/api/deepseek/chat', {
        sageId: sageKey,
        message: text,
        customPrompt: navSage?.prompt
      })

      const replyContent = res?.data?.message || '先贤微笑捋须，深以为然。'
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: 'ai',
          content: replyContent,
          time: getShichenTime()
        }
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: 'ai',
          content: '墨迹暂凝，砚台微干。且请君稍候片刻，再行畅叙。',
          time: getShichenTime()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  // 快捷转引物溯古今
  const handleCiteShiwu = () => {
    const quoteText = '太白兄，吾今日在今世见一保温杯，颇类古之执壶与汤瓶，兄以为今古器物之趣有何相通？'
    handleSend(quoteText)
  }

  return (
    <div className="scholar-chat-root">
      {/* 1. 顶部清雅导航栏 */}
      <header className="scholar-nav">
        <button type="button" className="scholar-nav__back" onClick={() => navigate(-1)}>
          <LeftOutline />
        </button>
        <div className="scholar-nav__center">
          <div className="scholar-nav__title-row">
            <span className="scholar-nav__name">{sageInfo.name}</span>
            <span className="scholar-nav__tag">{sageInfo.title}</span>
          </div>
          <span className="scholar-nav__status">● {sageInfo.status}</span>
        </div>
        <button
          type="button"
          className="scholar-nav__action"
          onClick={() => Toast.show({ content: '琴韵已绕梁' })}
        >
          <SoundOutline />
        </button>
      </header>

      {/* 2. 顶部知己水墨立绘横幅（Hero Banner） */}
      <section className="scholar-hero-banner">
        <div className="scholar-hero-banner__bg" />
        <div className="scholar-hero-banner__content">
          <div className="scholar-hero-banner__info">
            <p className="scholar-hero-banner__motto">“{sageInfo.motto}”</p>
            <div className="scholar-hero-banner__seal">{sageInfo.name.slice(0, 2)}墨宝</div>
          </div>
          <div className="scholar-hero-banner__portrait-box">
            <img
              src={sageInfo.portrait}
              alt={sageInfo.name}
              className="scholar-hero-banner__portrait"
            />
          </div>
        </div>
      </section>

      {/* 3. 4 大灵感胶囊（可直接点击发送） */}
      <section className="scholar-capsules-bar">
        <div className="scholar-capsules-scroll">
          {sageInfo.capsules.map((cap, idx) => (
            <button
              key={idx}
              type="button"
              className="scholar-capsule"
              onClick={() => handleSend(cap.replace(/^[^\s]+\s*/, ''))}
            >
              {cap}
            </button>
          ))}
        </div>
      </section>

      {/* 4. 消息流区域 */}
      <main className="scholar-messages-container" ref={chatScrollRef}>
        {messages.map((item) => (
          <div
            key={item.id}
            className={`scholar-msg-row scholar-msg-row--${item.role}`}
          >
            <div className="scholar-msg-time">{item.time}</div>
            <div className="scholar-msg-bubble-wrap">
              {item.role === 'ai' && (
                <div className="scholar-msg-avatar">
                  <img src={sageInfo.portrait} alt={sageInfo.name} />
                </div>
              )}

              <div className={`scholar-msg-bubble scholar-msg-bubble--${item.role}`}>
                <div className="scholar-msg-content">{item.content}</div>
              </div>

              {item.role === 'user' && (
                <div className="scholar-msg-avatar scholar-msg-avatar--user">
                  <img src={`${BASE}assets/guancang/sage_wangyangming.png`} alt="云山居士" />
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="scholar-loading-row">
            <span className="scholar-loading-text">
              先贤研墨思辨中 <DotLoading color="#8A2B2B" />
            </span>
          </div>
        )}
      </main>

      {/* 5. 底部宣纸输入与操作栏 */}
      <footer className="scholar-footer">
        <div className="scholar-footer__quick-tools">
          <button
            type="button"
            className="scholar-tool-btn"
            onClick={handleCiteShiwu}
          >
            🏺 引物溯古今
          </button>
          <button
            type="button"
            className="scholar-tool-btn"
            onClick={() => handleSend('请兄台以此时月色为题，口占一绝。')}
          >
            ✍️ 邀诗一首
          </button>
        </div>

        <div className="scholar-input-bar">
          <button
            type="button"
            className="scholar-mic-btn"
            onClick={() => Toast.show({ content: '且慢，语音抚弦功能研墨中…' })}
            title="语音畅论"
          >
            <i className="iconfont icon-maikefeng" />
          </button>

          <textarea
            className="scholar-textarea"
            rows={1}
            placeholder="挥毫泼墨，与君长谈…"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />

          <button
            type="button"
            className="scholar-send-btn"
            disabled={loading || !inputText.trim()}
            onClick={() => handleSend()}
          >
            <i className="iconfont icon-fasong" />
            <span>畅论</span>
          </button>
        </div>
      </footer>
    </div>
  )
}
