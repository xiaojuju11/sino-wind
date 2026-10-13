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
    capsules: ['〔金樽〕太白兄，何以解忧？', '〔邀月〕今夕何夕，对月起舞', '〔联句〕请与我同作五绝', '〔茶道〕唐代煎茶与宋点茶有何异？']
  },
  sushi: {
    name: '苏轼',
    title: '东坡居士',
    motto: '一蓑烟雨任平生，也无风雨也无晴。',
    status: '烹茶赋词中',
    portrait: `${BASE}assets/guancang/sage_sushi.png`,
    welcome: '老夫苏子瞻，今日刚得新茶一瓮，并烹东坡肉。天下名山僧占多，且坐下与老夫闲话平生。',
    capsules: ['〔食经〕东坡肉秘法几何？', '〔处世〕遇逆境如何豁达自适？', '〔西湖〕水光潋滟晴方好何意？', '〔词赋〕黄州赤壁赋有何深意？']
  },
  liqingzhao: {
    name: '李清照',
    title: '易安居士',
    motto: '何须浅碧深红色，自是花中第一流。',
    status: '倚栏校词中',
    portrait: `${BASE}assets/guancang/sage_liqingzhao.png`,
    welcome: '易安居士见过来客。沉醉不知归路，误入藕花深处——君有新词，愿与妾身切磋一番？',
    capsules: ['〔词韵〕易安词何以字字珠玑？', '〔金石〕金石录后序背后故事', '〔消愁〕三杯两盏淡酒何以销愁？', '〔秋思〕梧桐更兼细雨之境']
  },
  group_zhulin: {
    name: '竹林雅集 · 群聊',
    title: '魏晋名士',
    motto: '广陵绝响，竹林清风。',
    status: '先贤同席',
    portrait: `${BASE}assets/guancang/scroll_changhe.png`,
    welcome: '嵇康：广陵散绝矣，诸君请入席。阮籍：青白眼待客，来者皆名士。向秀：且寄幽怀于山林！',
    capsules: ['〔绝响〕广陵散何以绝世？', '〔风骨〕何为魏晋风骨与名士？', '〔同席〕与竹林诸贤共饮一樽', '〔山林〕寄情山水之逍遥意']
  },
  wangyangming: {
    name: '王阳明',
    title: '阳明先生',
    motto: '知善知恶是良知，为善去恶是格物。',
    status: '心学悟道中',
    portrait: `${BASE}assets/guancang/sage_wangyangming.png`,
    welcome: '阳明子见过使君。无善无恶心之体，有善有恶意之动。君今日心中有何凝滞，愿与老夫共参良知本体？',
    capsules: ['〔心学〕何谓知行合一？', '〔格物〕如何格物以致良知？', '〔事上〕何为事上磨炼之道？', '〔良知〕心外无物如何理解？']
  },
  dufu: {
    name: '杜甫',
    title: '少陵野老',
    motto: '安得广厦千万间，大庇天下寒士俱欢颜。',
    status: '掩卷沉思中',
    portrait: `${BASE}assets/guancang/sage_wangyangming.png`,
    welcome: '杜陵野老杜子美向使君致意。感时花溅泪，恨别鸟惊心。老拙虽飘零半生，然心系苍生黎庶，愿与君共话家国文章。',
    capsules: ['〔律诗〕少陵律诗沉郁顿挫之妙', '〔草堂〕浣花溪畔的生活与心境', '〔怀友〕子美太白之交情谊何在？', '〔忧思〕诗史背后的家国悲悯']
  },
  xinqiji: {
    name: '辛弃疾',
    title: '稼轩居士',
    motto: '男儿到死心如铁，看试手，补天裂。',
    status: '挑灯看剑中',
    portrait: `${BASE}assets/guancang/sage_libai.png`,
    welcome: '稼轩辛幼安来此会君！想当年金戈铁马，气吞万里如虎。天下英雄谁敌手？且与某家倾樽豪饮，畅论天下兴亡！',
    capsules: ['〔看剑〕醉里挑灯看剑之赤诚', '〔归隐〕稻花香里说丰年之淡泊', '〔豪放〕稼轩词之风骨与豪情', '〔破阵〕沙场秋点兵之英雄气概']
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

  // 匹配先贤元信息（兼容 /chat/:id 以及 /ai-chat 路由的 location.state.sageId）
  const sageKey = id || location.state?.sageId || location.state?.sage?.id || 'libai'
  const navSage = location.state?.sage
  const sageInfo = SAGE_HERO_MAP[sageKey] || {
    name: navSage?.name || '先贤雅士',
    title: navSage?.title || '千古知音',
    motto: '读千年风雅，与君共此山河。',
    status: '神交长谈中',
    portrait: navSage?.avatar || `${BASE}assets/guancang/sage_libai.png`,
    welcome: navSage?.welcome || '幸与足下相逢于云山竹简之境，且煮清茶以待君言。',
    capsules: ['〔经史〕请与我畅谈经史子集', '〔茶道〕茶道与修身之道', '〔心境〕如何保持内心宁静', '〔题咏〕作诗一首赠吾']
  }

  // 同步用户在“我的”页面中的头像与昵称
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('userInfo') || '{}')
      return {
        avatar: cached.avatar || `${BASE}assets/shuzhai/avatar_yunshan.png`,
        nickname: cached.nickname || '云山居士'
      }
    } catch {
      return {
        avatar: `${BASE}assets/shuzhai/avatar_yunshan.png`,
        nickname: '云山居士'
      }
    }
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.get('/api/auth/info')
        .then((res) => {
          if (res.data) {
            setUserProfile({
              avatar: res.data.avatar || `${BASE}assets/shuzhai/avatar_yunshan.png`,
              nickname: res.data.nickname || '云山居士'
            })
            try {
              localStorage.setItem('userInfo', JSON.stringify(res.data))
            } catch {
              // ignore
            }
          }
        })
        .catch(() => {})
    }
  }, [])

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
              onClick={() => handleSend(cap.replace(/^〔.+?〕\s*/, ''))}
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
                  <img
                    src={userProfile.avatar}
                    alt={userProfile.nickname}
                    onError={(e) => {
                      e.currentTarget.src = `${BASE}assets/shuzhai/avatar_yunshan.png`
                    }}
                  />
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
