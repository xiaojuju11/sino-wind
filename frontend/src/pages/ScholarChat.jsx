import { useScholarScope } from '../utils/useScholarScope'
import React, { useState, useRef, useEffect } from 'react'
import '../styles/scholarChat.less'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { LeftOutline, SoundOutline, EditSOutline, FileOutline, MessageOutline, CompassOutline, RightOutline } from 'antd-mobile-icons'
import { Toast, DotLoading } from 'antd-mobile'
import axios from '../http'
import FeihuaPanel from '../components/FeihuaPanel'
import { receiveScholarStream } from '../utils/scholarStream'
import { cachedLetters, loadLetterDetail, markLetterRead, saveLocalTurn, leaveScholar, shichen, scholarScope } from '../utils/scholarLetters'
import '../styles/scholarEcosystem.less'
import ScholarArtifactDrawer from '../components/ScholarArtifactDrawer'
import InkWashBackground from '../components/InkWashBackground'
import '../styles/referencePolish.less'
import { getScholarScene } from '../utils/scholarScenes'

const BASE = import.meta.env.BASE_URL
const CAPSULE_ICONS = [FileOutline, EditSOutline, MessageOutline, CompassOutline]

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

function ScholarChatSession() {
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
  const [failedScene, setFailedScene] = useState('')
  const scene = getScholarScene(sageKey, sageInfo.name)
  const hasScene = Boolean(scene && failedScene !== sageKey)

  // 同步用户在“我的”页面中的头像与昵称
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(`scholar-profile:v1:${scholarScope()}`) || '{}')
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
    const token = localStorage.getItem('token'), scope = scholarScope()
    let current = true
    if (token) {
      axios.get('/api/auth/info')
        .then((res) => {
          if (res.data && current && scope === scholarScope()) {
            setUserProfile({
              avatar: res.data.avatar || `${BASE}assets/shuzhai/avatar_yunshan.png`,
              nickname: res.data.nickname || '云山居士'
            })
            try {
              localStorage.setItem(`scholar-profile:v1:${scope}`, JSON.stringify({ avatar: res.data.avatar, nickname: res.data.nickname }))
            } catch {
              // ignore
            }
          }
        })
        .catch(() => {})
    }
    return () => { current = false }
  }, [])

  // 动态融合诗篇上下文胶囊
  const poemCtx = location.state?.poemContext
  const dynamicCapsules = poemCtx
    ? [`〔赏诗〕请与我畅论《${poemCtx.title}》心境`, ...sageInfo.capsules]
    : sageInfo.capsules

  // 消息列表
  const [messages, setMessages] = useState(() => {
    const welcome = poemCtx
      ? `${sageInfo.welcome}\n\n【雅集案头】：闻使君正品读吾之《${poemCtx.title}》（${(poemCtx.paragraphs || [])[0] || ''}），足下有何会心之论，愿与君共话当年！`
      : sageInfo.welcome
    return [
      {
        id: 'msg_welcome',
        role: 'ai',
        content: welcome,
        time: getShichenTime()
      }
    ]
  })
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [gameOpen, setGameOpen] = useState(false)
  const [hydrating, setHydrating] = useState(true)
  const [replyLetter, setReplyLetter] = useState(null)
  const [artifactOpen, setArtifactOpen] = useState(false)
  const activeRequest = useRef(null)
  const stopRequest = () => {
    const request = activeRequest.current
    if (!request) return
    request.controller.abort()
    clearInterval(request.timer)
    request.resolve?.()
    activeRequest.current = null
  }
  useEffect(() => {
    let current = true
    let restored = false
    const scope = scholarScope()
    setHydrating(true); setReplyLetter(null)
    setGameOpen(false)
    setLoading(false)
    const welcome = poemCtx
      ? `${sageInfo.welcome}\n\n【雅集案头】：正与君品读《${poemCtx.title}》，愿共论诗中微意。`
      : sageInfo.welcome
    setMessages([{ id: 'msg_welcome', role: 'ai', content: welcome, time: getShichenTime() }])
    const restore = row => {
      if (!current || scope !== scholarScope()) return
      if (row?.turns?.length) setMessages([{ id: 'msg_welcome', role: 'ai', content: welcome, time: getShichenTime() }, ...row.turns.flatMap(t => [
        { id: `${t.id}:user`, role: 'user', content: t.question, time: shichen(t.at) },
        { id: `${t.id}:ai`, role: 'ai', content: t.answer, degraded: t.degraded, time: shichen(t.at) }
      ])])
      if (row?.reply?.unread) {
        setReplyLetter(row.reply)
        markLetterRead(sageKey, row.reply.id).catch(() => {})
      }
      setHydrating(false)
      restored = true
    }
    const cached = cachedLetters().find(l => l.sageId === sageKey)
    loadLetterDetail(sageKey).then(restore).catch(() => { restore(cached); if (current) Toast.show({ content: '云端旧笺暂未载入，本机原稿保留' }) })
    const leave = () => { if (restored && scope === scholarScope()) leaveScholar(sageKey) }
    window.addEventListener('pagehide', leave)
    return () => { current = false; stopRequest(); window.removeEventListener('pagehide', leave); leave() }
    // The selected sage defines a new conversation; previous network work is cancelled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sageKey])
  const chatScrollRef = useRef(null)

  // 滚动到底部
  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: loading ? 'auto' : 'smooth'
    })
  }, [messages, loading])

  // One reader and one animation clock per request. Navigation cancels both.
  const handleSend = async (customContent, artifactId) => {
    const text = (customContent || inputText).trim()
    if (!text || activeRequest.current || gameOpen || hydrating) return
    if (text.length > 2000) { Toast.show({ content: '请将论道内容控制在两千字以内' }); return }
    const userMsg = { id: crypto.randomUUID(), role: 'user', content: text, time: getShichenTime() }
    const aiId = crypto.randomUUID()
    const scope = scholarScope()
    const request = { controller: new AbortController(), queue: [], position: 0, finished: false, timer: null, resolve: null }
    const painted = new Promise(resolve => { request.resolve = resolve })
    activeRequest.current = request
    setMessages(prev => [...prev, userMsg, { id: aiId, role: 'ai', content: '', streaming: true, time: getShichenTime() }])
    if (!customContent) setInputText('')
    setLoading(true)
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    request.timer = setInterval(() => {
      if (activeRequest.current !== request) return
      const length = request.queue.length - request.position
      if (length) {
        const take = reducedMotion ? length : Math.max(1, Math.min(6, Math.ceil(length / 45)))
        const fresh = request.queue.slice(request.position, request.position + take).join('')
        request.position += take
        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: m.content + fresh } : m))
      }
      if (request.finished && request.position >= request.queue.length) {
        clearInterval(request.timer); request.resolve()
      }
    }, 24)
    const timeout = setTimeout(() => request.controller.abort(), 40000)
    try {
      const history = messages.filter(m => m.content && !m.failed).slice(-8).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }))
      await receiveScholarStream(axios.getUri({ url: '/api/deepseek/chat/stream' }), { sageId: sageKey, message: text, history, requestId: userMsg.id, ...(artifactId ? { artifactId } : {}) }, request.controller.signal, (event, data) => {
        if (activeRequest.current !== request) return
        if (scope !== scholarScope()) { stopRequest(); window.dispatchEvent(new Event('scholarSessionChanged')); return }
        if (event === 'delta' && typeof data.text === 'string') request.queue.push(...Array.from(data.text).slice(0, Math.max(0, 2000 - request.queue.length)))
        if (event === 'replace' && typeof data.text === 'string') {
          request.queue = Array.from(data.text); request.position = 0
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: '' } : m))
        }
        if (event === 'meta') setMessages(prev => prev.map(m => m.id === aiId ? { ...m, degraded: Boolean(data.degraded) } : m))
        if (event === 'done' && scope === scholarScope()) {
          const savedLocally = saveLocalTurn(sageKey, { id: userMsg.id, question: text, answer: request.queue.join(''), at: Date.now(), degraded: Boolean(data.degraded), archiveSaved: Boolean(data.archiveSaved) })
          if (data.counted) window.dispatchEvent(new Event('userInfoUpdated'))
          if (!savedLocally) Toast.show({ content: data.archiveSaved ? '本机空间不足，记录已保存云端' : '本机记录未保存，请先复制本次对答，勿关闭页面' })
          else if (localStorage.getItem('token') && !data.archiveSaved) Toast.show({ content: '本次对话已存本机，服务端信札暂未归档' })
        }
      })
    } catch (error) {
      if (activeRequest.current === request) {
        if (request.controller.signal.aborted) request.queue.length = request.position
        const message = request.controller.signal.aborted ? '本次对席已停止，可重新畅论。' : error.message
        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, failed: true, error: message } : m))
      }
    } finally {
      clearTimeout(timeout)
      if (activeRequest.current === request) {
        request.finished = true
        await painted
        if (activeRequest.current === request) {
          activeRequest.current = null
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, streaming: false } : m))
          setLoading(false)
        }
      }
    }
  }

  const [isSpeaking, setIsSpeaking] = useState(false)
  const stopVoice = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
  }

  // 离开页面、切换先贤、或者页面隐藏时彻底停止先贤诵音
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) stopVoice()
    }
    window.addEventListener('pagehide', stopVoice)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      stopVoice()
      window.removeEventListener('pagehide', stopVoice)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [sageKey])

  // 雅乐与先贤诵音：纯浏览器古琴合成 + 沉稳名士语调
  const playVoice = (text) => {
    if (isSpeaking) {
      stopVoice()
      Toast.show({ content: '诵音已止' })
      return
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        const ctx = new AudioCtx()
        const notes = [261.63, 329.63, 392.00]
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15)
          gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15)
          gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.15 + 0.03)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.8)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(ctx.currentTime + i * 0.15)
          osc.stop(ctx.currentTime + i * 0.15 + 0.9)
        })
      }
      if ('speechSynthesis' in window && text) {
        window.speechSynthesis.cancel()
        const clean = text.replace(/〔.+?〕/g, '').replace(/[“”"']/g, '')
        const utterance = new SpeechSynthesisUtterance(clean.slice(0, 120))
        utterance.lang = 'zh-CN'
        utterance.rate = 0.85
        utterance.pitch = 0.9
        utterance.onend = () => setIsSpeaking(false)
        utterance.onerror = () => setIsSpeaking(false)
        setIsSpeaking(true)
        window.speechSynthesis.speak(utterance)
        Toast.show({ content: '先贤诵音绕梁…' })
      } else {
        Toast.show({ content: '琴韵已绕梁' })
      }
    } catch {
      setIsSpeaking(false)
      Toast.show({ content: '琴韵已绕梁' })
    }
  }

  // 快捷转引物溯古今
  const handleCiteShiwu = () => {
    if (!loading && !hydrating) setArtifactOpen(true)
  }

  return (
    <div className={`scholar-chat-root reference-polish${gameOpen ? " is-game" : ""}${hasScene ? ' has-sage-scene' : ''}`}>
      {hasScene && <div className='scholar-scene' aria-hidden='true'>
        <img key={scene.src} className='scholar-scene__art' src={scene.src} alt='' decoding='async' fetchPriority='high' onError={() => setFailedScene(sageKey)} />
        <div className='scholar-scene__shade' />
      </div>}
      <InkWashBackground atmosphereOnly={hasScene} />
      {artifactOpen && <ScholarArtifactDrawer onClose={() => setArtifactOpen(false)} onPick={item => {
        setArtifactOpen(false)
        handleSend(`${sageInfo.name}先生，吾日前识得「${item.name}」，记录暂考为「${item.dynasty || '年代待考'}」${item.degraded ? '，此项仍为内置资料推演' : ''}。${scholarScope() === 'guest' ? `本机考释资料：${item.description.slice(0, 800)}。` : ''}愿请先生从所属时代的器用与风雅辨析其来历；若晚于先生之世，亦请说明为跨时推论，不知此物与古今生活有何相通？`, scholarScope() === 'guest' ? undefined : item.id)
      }} />}
      {/* 1. 顶部清雅导航栏 */}
      <header className="scholar-nav">
        <button
          type="button"
          className="scholar-nav__back"
          onClick={() => {
            stopVoice()
            navigate(-1)
          }}
        >
          <LeftOutline />
        </button>
        <div className="scholar-nav__center">
          <div className="scholar-nav__title-row">
            <span className="scholar-nav__name">{sageInfo.name}</span>
            <span className="scholar-nav__tag">{sageInfo.title}</span>
          </div>
          <span className="scholar-nav__status"><span className='scholar-status-dot' aria-hidden='true' />{sageInfo.status}</span>
        </div>
        <div className="scholar-nav__right">
          <button
            type="button"
            className={`scholar-nav__action ${isSpeaking ? 'is-speaking' : ''}`}
            onClick={() => {
              const lastAiMsg = [...messages].reverse().find(m => m.role === 'ai')
              playVoice(lastAiMsg ? lastAiMsg.content : sageInfo.welcome)
            }}
            aria-label={isSpeaking ? '停止诵音' : '聆听诵音'}
          >
            <SoundOutline />
          </button>
        </div>
      </header>

      {/* 2. 消息流区域：先贤入席名帖与论道发语随对话自然滚动，彻底解除对长谈消息的遮挡 */}
      <main className="scholar-messages-container" ref={chatScrollRef}>
        {!gameOpen && (
          <div className="scholar-chat-header-flow">
            {/* 顶部知己水墨立绘名帖：开篇展现先贤风骨，随消息自然滑动，绝不常驻遮挡 */}
            <section className="scholar-hero-banner">
              <div className="scholar-hero-banner__bg" />
              <div className="scholar-hero-banner__content">
                <div className="scholar-hero-banner__portrait-box">
                  <img
                    src={sageKey === 'libai' ? `${BASE}assets/guancang/sage-libai-full-v2.png` : (hasScene && scene.src ? scene.src : sageInfo.portrait)}
                    alt={sageInfo.name}
                    className="scholar-hero-banner__portrait"
                  />
                </div>
                <div className="scholar-hero-banner__info">
                  <div className="scholar-hero-banner__names">
                    <span className="scholar-hero-banner__name">{sageInfo.name}</span>
                    <span className="scholar-hero-banner__tag">{sageInfo.title}</span>
                    <span className="scholar-hero-banner__seal">{hasScene ? scene.title : `${sageInfo.name}墨宝`}</span>
                  </div>
                  <p className="scholar-hero-banner__motto">“{sageInfo.motto}”</p>
                </div>
              </div>
            </section>

            {/* 论道发语灵感推荐 */}
            <section className="scholar-capsules-bar">
              <div className="scholar-capsules-heading">
                <span className="scholar-capsules-heading__title">
                  <CompassOutline /> 论道发语 · 触景叩问
                </span>
                <span className="scholar-capsules-heading__tip">点击即刻入席</span>
              </div>
              <div className="scholar-capsules-scroll">
                {dynamicCapsules.map((cap, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="scholar-capsule"
                    onClick={() => handleSend(cap.replace(/^〔.+?〕\s*/, ''))}
                  >
                    <span className='scholar-capsule__icon' aria-hidden='true'>
                      {React.createElement(CAPSULE_ICONS[idx % CAPSULE_ICONS.length])}
                    </span>
                    <span className='scholar-capsule__label'>
                      {cap.replace(/^〔.+?〕\s*/, '')}
                    </span>
                    <RightOutline className='scholar-capsule__arrow' aria-hidden='true' />
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
        {hydrating && <p role='status'>正在展读旧笺…</p>}
        {!gameOpen && replyLetter && <aside className='scholar-reply-letter' aria-label='知音回柬'><strong>知音回柬 · {replyLetter.kind}</strong><p>{replyLetter.text}</p><button type='button' onClick={() => setReplyLetter(null)}>收笺续谈</button></aside>}
        {gameOpen && <FeihuaPanel key={sageKey} sageId={sageKey} onClose={() => setGameOpen(false)} />}
        {!gameOpen && messages.map((item) => (
          <div
            key={item.id}
            className={`scholar-msg-row scholar-msg-row--${item.role}`}
          >
            <div className="scholar-msg-time">{item.time}</div>
            <div className="scholar-msg-bubble-wrap">
              {item.role === 'ai' && (
                <div className="scholar-msg-avatar">
                  <img src={hasScene && scene.face ? scene.src : sageInfo.portrait} alt={sageInfo.name}
                    className={hasScene && scene.face ? 'scholar-msg-portrait' : undefined}
                    style={hasScene && scene.face ? { '--face-left': `${50 - scene.face[0] * 800}%`, '--face-top': `${50 - scene.face[1] * 1600}%` } : undefined} />
                </div>
              )}

              <div className={`scholar-msg-bubble scholar-msg-bubble--${item.role}`}>
                <div className="scholar-msg-content" aria-busy={Boolean(item.streaming)}>
                  {item.streaming ? <>{Array.from(item.content).slice(0, -3).join('')}<span className="scholar-ink-fresh" key={item.content.length}>{Array.from(item.content).slice(-3).join('')}</span></> : item.content}
                  {item.streaming && <span className="scholar-ink-caret" aria-hidden="true" />}
                  {item.degraded && <small className="scholar-stream-note">离线情境对答</small>}
                  {item.error && <small className="scholar-stream-note" role="status">{item.error}</small>}
                </div>
                {item.role === 'ai' && (
                  <button
                    type="button"
                    className="scholar-msg-sound-btn"
                    onClick={() => playVoice(item.content)}
                    aria-label="诵读此言"
                    title="聆听名士诵读"
                  >
                    <SoundOutline />
                    <span>品韵</span>
                  </button>
                )}
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

        {loading && !gameOpen && (
          <div className="scholar-loading-row">
            <span className="scholar-loading-text">
              先贤研墨思辨中 <DotLoading color="#8A2B2B" />
            </span>
          </div>
        )}
      </main>

      {/* 5. 底部宣纸输入与操作栏 */}
      {!gameOpen && <footer className="scholar-footer">
        <div className="scholar-footer__quick-tools">
          {['libai', 'sushi', 'liqingzhao', 'wangyangming', 'dufu'].includes(sageKey) && <button type="button" className="scholar-tool-btn" disabled={loading || hydrating} onClick={() => setGameOpen(true)}><EditSOutline /> 飞花令</button>}
          {loading && <button type="button" className="scholar-tool-btn" onClick={() => activeRequest.current?.controller.abort()}>停止研墨</button>}
          <button
            type="button"
            className="scholar-tool-btn"
            disabled={loading || hydrating}
            onClick={handleCiteShiwu}
          >
            <span className="scholar-tool-seal">物</span>
            引物溯古今
          </button>
          <button
            type="button"
            className="scholar-tool-btn"
            onClick={() => handleSend('请兄台以此时月色为题，口占一绝。')}
          >
            <EditSOutline className="scholar-tool-icon" />
            邀诗一首
          </button>
          <button
            type="button"
            className="scholar-tool-btn"
            onClick={() => chatScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <CompassOutline className="scholar-tool-icon" />
            论道锦囊
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
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !e.isComposing) {
                e.preventDefault()
                handleSend()
              }
            }}
          />

          <button
            type="button"
            className="scholar-send-btn"
            disabled={loading || hydrating || !inputText.trim()}
            onClick={() => handleSend()}
          >
            <i className="iconfont icon-fasong" />
            <span>畅论</span>
          </button>
        </div>
      </footer>}
    </div>
  )
}

export default function ScholarChat() {
  const scope = useScholarScope()
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])
  return <ScholarChatSession key={scope} />
}
