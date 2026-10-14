import ReferenceCorners from '../components/ReferenceCorners'
import '../styles/poem.less'
import '../styles/poemMetre.less'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchBar, Toast } from 'antd-mobile'
import {
  LeftOutline,
  RightOutline,
  SearchOutline,
  RedoOutline,
  HeartOutline,
  ContentOutline,
  DownOutline,
  SoundOutline,
} from 'antd-mobile-icons'
import axios from '../http'
import ThemeToggle from '../context/ThemeToggle.jsx'
import RadarChart from '../components/RadarChart.jsx'
import TonePattern from '../components/TonePattern.jsx'
import InkSpreadZone from '../components/InkSpreadZone.jsx'
import { buildMetreReport, scoreDimensions } from '../utils/poemMetre.js'
import InkWashBackground from '../components/InkWashBackground'
import '../styles/referencePolish.less'
import { getScholarScene } from '../utils/scholarScenes'


// 🏮 接口异常时的优雅降级诗库（保证页面永不空白）
const MOCK_POEMS = [
  {
    id: 'mock_1',
    title: '水调歌头·明月几时有',
    author: '苏轼',
    dynasty: '宋代',
    paragraphs: [
      '明月几时有？把酒问青天。',
      '不知天上宫阙，今夕是何年。',
      '我欲乘风归去，又恐琼楼玉宇，高处不胜寒。',
      '起舞弄清影，何似在人间。',
    ],
    appreciation:
      '此词作于丙辰年中秋，兼怀子由。东坡借月抒怀，把出世与入世的矛盾化作「千里共婵娟」的旷达，是宋词豪放与深情并存的典范。',
  },
  {
    id: 'mock_2',
    title: '将进酒',
    author: '李白',
    dynasty: '唐代',
    paragraphs: [
      '君不见黄河之水天上来，奔流到海不复回。',
      '君不见高堂明镜悲白发，朝如青丝暮成雪。',
      '人生得意须尽欢，莫使金樽空对月。',
      '天生我材必有用，千金散尽还复来。',
    ],
    appreciation:
      '诗仙以黄河奔涌起兴，把时光易逝与生命自信拧成一股狂放之气。表面劝酒，实则是对生命价值的最高肯定。',
  },
  {
    id: 'mock_3',
    title: '声声慢·寻寻觅觅',
    author: '李清照',
    dynasty: '宋代',
    paragraphs: [
      '寻寻觅觅，冷冷清清，凄凄惨惨戚戚。',
      '乍暖还寒时候，最难将息。',
      '三杯两盏淡酒，怎敌他、晚来风急？',
      '梧桐更兼细雨，到黄昏、点点滴滴。',
    ],
    appreciation:
      '开篇十四叠字，千古未见。易安以口语入词，把国破家亡后的孤寂写得层层递进，婉约至极而骨力不减。',
  },
  {
    id: 'mock_4',
    title: '饮酒·其五',
    author: '陶渊明',
    dynasty: '东晋',
    paragraphs: [
      '结庐在人境，而无车马喧。',
      '问君何能尔？心远地自偏。',
      '采菊东篱下，悠然见南山。',
      '此中有真意，欲辨已忘言。',
    ],
    appreciation:
      '「心远地自偏」五字道尽隐逸真谛。采菊见山，物我两忘，是中国文人田园精神的源头活水。',
  },
]

// 搜索结果只有摘要时，按句读断成对仗句
function toLines(text = '') {
  return text
    .split(/(?<=[。！？；])/)
    .map((line) => line.trim())
    .filter(Boolean)
}

// 兼容后端两种字段口径：契约的 paragraphs[] 与成员 A 实现里的 content[] / content 字符串
function toParagraphs(source) {
  if (!source) return []
  if (Array.isArray(source)) return source.filter((line) => typeof line === 'string' && line.trim())
  if (typeof source === 'string') return toLines(source)
  return []
}

// 搜索结果摘要：优先 snippet，其次 content（数组或字符串）
function snippetOf(item) {
  const raw = item.snippet || item.content || ''
  const text = Array.isArray(raw) ? raw.join('') : String(raw)
  return text.length > 46 ? `${text.slice(0, 46)}…` : text
}

export default function PoemPage() {
  const navigate = useNavigate()
  const [poem, setPoem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [showAppreciation, setShowAppreciation] = useState(false)
  const [stamp, setStamp] = useState(false)
  const [collecting, setCollecting] = useState(false)
  const [collectTip, setCollectTip] = useState('')
  const [reciting, setReciting] = useState(false)
  const appreciateRef = useRef(null)
  const scrollRef = useRef(null)
  const scrollInkRef = useRef(null)

  // 赏析多维状态
  const [appreciationData, setAppreciationData] = useState(null)
  const [appreciationTab, setAppreciationTab] = useState('overview')
  const [loadingAppreciation, setLoadingAppreciation] = useState(false)

  // 离开页面时停止所有朗读语音
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // 雅乐聆音：古琴五声音阶纯浏览器合成（宫商角徵羽）
  const playGuqinArpeggio = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const notes = [261.63, 329.63, 392.00, 440.00, 523.25, 392.00]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.4)
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.4)
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.4 + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.4 + 1.2)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + i * 0.4)
        osc.stop(ctx.currentTime + i * 0.4 + 1.2)
      })
    } catch {
      // 容错兜底
    }
  }

  // 获取诗词多维深度赏析（AI 雅析 + 本地经典文库）
  const fetchAppreciation = useCallback(async (currentPoem) => {
    if (!currentPoem || !currentPoem.title) return
    setLoadingAppreciation(true)
    try {
      const res = await axios.post('/api/poem/appreciate', {
        title: currentPoem.title,
        author: currentPoem.author,
        dynasty: currentPoem.dynasty,
        content: currentPoem.paragraphs
      })
      if (res?.data?.code === 1 && res.data.data) {
        setAppreciationData(res.data.data)
        return
      }
    } catch {
      // 接口降级
    } finally {
      setLoadingAppreciation(false)
    }

    // 默认高雅兜底结构
    setAppreciationData({
      overview: currentPoem.appreciation || '此篇文辞雅健，意境旷远，声情相称，极具宋韵风骨。',
      translation: currentPoem.paragraphs?.join('；') || '清风入弦，词句自得，言尽而意无穷。',
      background: `${currentPoem.author || '先贤'}借景抒怀，借物寄意，笔底自有一番平生阅历与时代浩叹。`,
      highlight: currentPoem.paragraphs?.[0] ? `「${currentPoem.paragraphs[0]}」——字句清拔，耐人咀华。` : '句法对仗工整，起承转合浑然天成。',
      sageVoice: `此作乃吾平生性灵所聚，得遇今之雅客抚卷相看，亦足慰平生。`,
      sageId: null
    })
    setLoadingAppreciation(false)
  }, [])

  // 雅韵吟诵（Web Speech API TTS 沉稳慢读 + 古琴轻泛起兴）
  const handleToggleRecitation = () => {
    if (!poem) return
    if (!('speechSynthesis' in window)) {
      playGuqinArpeggio()
      Toast.show({ content: '浏览器未开启语音合成，且听古琴绕梁' })
      return
    }

    if (reciting) {
      window.speechSynthesis.cancel()
      setReciting(false)
      Toast.show({ content: '吟诵已止' })
      return
    }

    window.speechSynthesis.cancel()
    playGuqinArpeggio()

    const text = `《${poem.title}》。${poem.author}。${(poem.paragraphs || []).join('，')}`
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'zh-CN'
    utter.rate = 0.82
    utter.pitch = 0.96

    utter.onstart = () => {
      setReciting(true)
      Toast.show({ content: '雅韵清吟，静听诗声' })
    }
    utter.onend = () => setReciting(false)
    utter.onerror = () => setReciting(false)

    window.speechSynthesis.speak(utter)
  }

  // 底部「诗意赏析」按钮：展开并滚动到赏析面板
  const toggleAppreciation = () => {
    setShowAppreciation((open) => {
      const next = !open
      if (next) {
        if (!appreciationData && poem) {
          fetchAppreciation(poem)
        }
        setTimeout(() => appreciateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120)
      }
      return next
    })
  }

  // 携诗问道：带入当前诗篇上下文跳转至先贤对席
  const handleChatWithSage = () => {
    if (!appreciationData?.sageId) return
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    navigate(`/scholar-chat/${appreciationData.sageId}`, {
      state: {
        sageId: appreciationData.sageId,
        poemContext: poem
      }
    })
  }

  // 拉取随机诗词
  const loadRandom = useCallback(async () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    setReciting(false)
    setLoading(true)
    setAppreciationData(null)
    setAppreciationTab('overview')
    try {
      const res = await axios.get('/api/poem/random')
      const data = res?.data?.data
      if (data && data.title) {
        const nextPoem = {
          id: data.id || data.poemId || `poem_${Date.now()}`,
          title: data.title,
          author: data.author,
          dynasty: data.dynasty || '古代',
          paragraphs: toParagraphs(data.paragraphs || data.content),
          appreciation: data.appreciation || '',
          bgArt: data.bgArt || '',
        }
        setPoem(nextPoem)
        fetchAppreciation(nextPoem)
      } else {
        throw new Error('empty')
      }
    } catch {
      // 优雅降级
      const pick = MOCK_POEMS[Math.floor(Math.random() * MOCK_POEMS.length)]
      setPoem(pick)
      fetchAppreciation(pick)
    } finally {
      setLoading(false)
      setShowAppreciation(false)
    }
  }, [fetchAppreciation])

  useEffect(() => {
    loadRandom()
  }, [loadRandom])

  // 关键词搜索
  const handleSearch = async (value) => {
    const q = (value || '').trim()
    setKeyword(q)
    if (!q) {
      setResults(null)
      return
    }
    setSearching(true)
    try {
      const res = await axios.get('/api/poem/search', { params: { q } })
      const list = res?.data?.data
      setResults(Array.isArray(list) ? list : [])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  // 选中搜索结果 → 陈列于诗卷
  const handlePickResult = (item) => {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    setReciting(false)
    const nextPoem = {
      id: item.id || `poem_${Date.now()}`,
      title: item.title,
      author: item.author,
      dynasty: item.dynasty || '古代',
      paragraphs: toParagraphs(item.paragraphs || item.content || item.snippet),
      appreciation: item.appreciation || '',
    }
    setPoem(nextPoem)
    setResults(null)
    setKeyword('')
    setShowAppreciation(false)
    setAppreciationData(null)
    setAppreciationTab('overview')
    fetchAppreciation(nextPoem)
  }

  // 摘录入卷（收藏）：朱砂印章动效 + 落库
  const handleCollect = async () => {
    if (!poem || collecting) return
    if (!localStorage.getItem('token')) {
      Toast.show({ content: '请先入席登录，方可摘录入卷' })
      return
    }
    setStamp(true)
    setTimeout(() => setStamp(false), 1250)

    // 朱砂印章下压：在诗卷中央激荡扩散朱砂印泥水墨晕染
    if (scrollRef.current && scrollInkRef.current) {
      const rect = scrollRef.current.getBoundingClientRect()
      scrollInkRef.current.triggerBleed(rect.width / 2, rect.height * 0.38, 'cinnabar', 2.2)
    }

    setCollecting(true)
    try {
      const res = await axios.post('/api/poem/collect', {
        poemId: poem.id,
        title: poem.title,
        author: poem.author,
        dynasty: poem.dynasty,
        content: (poem.paragraphs || []).join(''),
        appreciation: poem.appreciation || '',
      })
      const count = res?.data?.newPoemCount
      setCollectTip(count ? `已摘录入卷 · 诗笺共 ${count} 篇` : '已摘录入卷')
      Toast.show({ icon: 'success', content: res?.data?.message || '已成功摘录入卷' })
    } catch {
      // 错误拦截器统一处理
    } finally {
      setCollecting(false)
    }
  }

  const lines = useMemo(() => poem?.paragraphs?.filter(Boolean) || [], [poem])

  // ── 格律算法：平水韵平仄判定 + 押韵校验（纯前端算法，不依赖接口）──
  // 换一首诗时 poem 变化 → 重算 → 雷达图弹簧自动弹性形变到新分值
  const metreReport = useMemo(() => {
    if (!lines.length) return null
    return buildMetreReport(lines, {
      title: poem?.title,
      dynasty: poem?.dynasty,
      author: poem?.author,
    })
  }, [lines, poem?.title, poem?.dynasty, poem?.author])

  const radarData = useMemo(() => {
    if (!metreReport?.ok) return null
    return scoreDimensions(metreReport, { title: poem?.title, author: poem?.author })
  }, [metreReport, poem?.title, poem?.author])

  // 雷达图五个维度的悬停联动（悬停标签时高亮对应维度行）
  const [activeDimension, setActiveDimension] = useState(null)

  return (
    <div className={`poem-root reference-polish${results !== null ? ' is-searching' : ''}`}>
      <InkWashBackground />
      {/* 顶部：返回 + 标题 + 日月一键切换 */}
      <header className="poem-header">
        <div
          className="poem-header__back"
          onClick={() => {
            if (window.speechSynthesis) window.speechSynthesis.cancel()
            navigate('/home')
          }}
          title="返回雅集"
        >
          <LeftOutline />
        </div>
        <h1 className="poem-header__title">古诗词鉴赏</h1>
        <span className='poem-header__seal'>云山竹简</span>
        <ThemeToggle className="poem-header__theme" />
      </header>
      <p className='poem-reference-sub'>读千年风雅 与君共此山河</p>

      {/* 顶部搜索框 */}
      <div className="poem-search">
        <SearchBar
          icon={<SearchOutline />}
          placeholder="检索诗名、作者或佳句，如「明月」"
          value={keyword}
          onChange={setKeyword}
          onSearch={handleSearch}
          onClear={() => {
            setKeyword('')
            setResults(null)
          }}
        />
      </div>

      {/* 搜索结果 */}
      {results !== null && (
        <section className="poem-results">
          <ReferenceCorners />
          {searching && <div className="poem-results__loading">墨迹研开中……</div>}
          {!searching && results.length === 0 && (
            <div className="poem-results__empty">未寻得相关诗篇，换一关键字再试</div>
          )}
          {!searching &&
            results.map((item) => (
              <div className="poem-results__item" key={item.id || item.title} onClick={() => handlePickResult(item)}>
                <img className='poem-results__art' data-sage-art={Boolean(!item.bgArt && getScholarScene('', item.author))} src={item.bgArt || getScholarScene('', item.author)?.src || `${import.meta.env.BASE_URL}assets/home/bg-poem.jpg`} alt='' loading='lazy' />
                <div className="poem-results__main">
                  <div className="poem-results__title">{item.title}</div>
                  <div className="poem-results__meta">
                    {item.dynasty} · {item.author}
                  </div>
                  {snippetOf(item) && <div className="poem-results__snippet">{snippetOf(item)}</div>}
                </div>
                <RightOutline className="poem-results__arrow" />
              </div>
            ))}
        </section>
      )}

      {/* 宣纸诗卷主体：内嵌触控水墨落笔晕染 */}
      <section className="poem-scroll" ref={scrollRef}>
        <ReferenceCorners />
        <InkSpreadZone ref={scrollInkRef} targetRef={scrollRef} color="ink" />

        {poem?.bgArt && (
          <span className="poem-scroll__watermark" style={{ backgroundImage: `url(${poem.bgArt})` }} />
        )}

        {loading || !poem ? (
          /* 加载态：与主卡同尺寸的宣纸灰骨架占位 */
          <div className="poem-scroll__skeleton" role="status" aria-live="polite">
            <span className="poem-skeleton__bar poem-skeleton__bar--title" />
            <span className="poem-skeleton__bar poem-skeleton__bar--meta" />
            <div className="poem-scroll__divider" />
            <span className="poem-skeleton__bar poem-skeleton__bar--verse" />
            <span className="poem-skeleton__bar poem-skeleton__bar--verse" />
            <span className="poem-skeleton__bar poem-skeleton__bar--verse-short" />
            <span className="poem-skeleton__hint">墨迹研开中……</span>
          </div>
        ) : (
          <>
            <h2 className="poem-scroll__title">{poem.title}</h2>

            <div className="poem-scroll__meta">
              <span className="poem-scroll__dynasty">{poem.dynasty}</span>
              <span className="poem-scroll__author">{poem.author}</span>
            </div>

            <div className="poem-scroll__divider" />

            <div className="poem-scroll__body">
              {lines.map((line, index) => (
                <span className="poem-scroll__line" key={`${line}-${index}`}>
                  {line}
                </span>
              ))}
            </div>

            {collectTip && <p className="poem-scroll__source">{collectTip}</p>}
          </>
        )}
      </section>

      <section className="poem-actions">
        <button className="poem-action poem-action--primary" type="button" onClick={handleCollect} disabled={collecting}>
          <HeartOutline />
          摘录入卷
        </button>

        <button className="poem-action poem-action--ghost" type="button" onClick={loadRandom}>
          <RedoOutline />
          换一首
        </button>

        <button
          className={`poem-action ${reciting ? 'poem-action--primary' : 'poem-action--ghost'}`}
          type="button"
          onClick={handleToggleRecitation}
        >
          <SoundOutline />
          {reciting ? '吟诵中 (按此停止)' : '雅韵吟诵'}
        </button>

        <button
          className={`poem-action ${showAppreciation ? 'poem-action--primary' : 'poem-action--ghost'}`}
          type="button"
          onClick={toggleAppreciation}
        >
          <ContentOutline />
          诗意雅析
        </button>

        <button
          className="poem-action poem-action--ghost"
          type="button"
          onClick={() => {
            if (window.speechSynthesis) window.speechSynthesis.cancel()
            navigate('/home')
          }}
        >
          <LeftOutline />
          返回雅集
        </button>
      </section>

      {/* 诗意赏析折叠面板（升级四维解构 + 先贤亲解） */}
      <section className={`poem-appreciation ${showAppreciation ? 'is-open' : ''}`} ref={appreciateRef}>
        <div className="poem-appreciation__head" onClick={toggleAppreciation}>
          <ContentOutline className="poem-appreciation__icon" />
          <span>诗意雅析</span>
          {appreciationData?.sageId && <span className="poem-appreciation__badge">先贤亲解</span>}
          <DownOutline className="poem-appreciation__toggle" />
        </div>

        <div className="poem-appreciation__body">
          {/* 赏析维度选项卡 */}
          <div className="poem-appreciation__tabs">
            <button
              type="button"
              className={`poem-appreciation__tab ${appreciationTab === 'overview' ? 'is-active' : ''}`}
              onClick={() => setAppreciationTab('overview')}
            >
              <span className="poem-appreciation__tab-mark">赏</span> 意境总赏
            </button>
            <button
              type="button"
              className={`poem-appreciation__tab ${appreciationTab === 'translation' ? 'is-active' : ''}`}
              onClick={() => setAppreciationTab('translation')}
            >
              <span className="poem-appreciation__tab-mark">译</span> 白话今译
            </button>
            <button
              type="button"
              className={`poem-appreciation__tab ${appreciationTab === 'background' ? 'is-active' : ''}`}
              onClick={() => setAppreciationTab('background')}
            >
              <span className="poem-appreciation__tab-mark">境</span> 创作心境
            </button>
            <button
              type="button"
              className={`poem-appreciation__tab ${appreciationTab === 'highlight' ? 'is-active' : ''}`}
              onClick={() => setAppreciationTab('highlight')}
            >
              <span className="poem-appreciation__tab-mark">警</span> 名句咀华
            </button>
            {appreciationData?.sageVoice && (
              <button
                type="button"
                className={`poem-appreciation__tab poem-appreciation__tab--sage ${appreciationTab === 'sageVoice' ? 'is-active' : ''}`}
                onClick={() => setAppreciationTab('sageVoice')}
              >
                <span className="poem-appreciation__tab-mark">题</span> 先贤手记
              </button>
            )}
          </div>

          {/* 赏析正文内容 */}
          <div className="poem-appreciation__content">
            {loadingAppreciation ? (
              <div className="poem-appreciation__loading">
                <span>研墨品赏中……</span>
              </div>
            ) : (
              <>
                {appreciationTab === 'overview' && (
                  <p className="poem-appreciation__text">
                    {appreciationData?.overview || poem?.appreciation || '此篇文辞雅健，意境旷远，声情相称，极具宋韵风骨。'}
                  </p>
                )}

                {appreciationTab === 'translation' && (
                  <p className="poem-appreciation__text">
                    {appreciationData?.translation || lines.join('；')}
                  </p>
                )}

                {appreciationTab === 'background' && (
                  <p className="poem-appreciation__text">
                    {appreciationData?.background || `${poem?.author || '作者'}借景抒怀，笔底蕴藉平生胸臆。`}
                  </p>
                )}

                {appreciationTab === 'highlight' && (
                  <p className="poem-appreciation__text">
                    {appreciationData?.highlight || lines[0] || '对仗工整，意境悠长。'}
                  </p>
                )}

                {appreciationTab === 'sageVoice' && (
                  <div className="poem-appreciation__sage-card">
                    <div className="poem-appreciation__sage-title">
                      <span><span className="poem-appreciation__tab-mark">题</span> {poem?.author} · 亲解题录</span>
                    </div>
                    <p className="poem-appreciation__text">
                      {appreciationData?.sageVoice}
                    </p>
                    {appreciationData?.sageId && (
                      <button
                        type="button"
                        className="poem-appreciation__sage-btn"
                        onClick={handleChatWithSage}
                      >
                        携诗入席 · 与{poem?.author}论道 <RightOutline aria-hidden='true' />
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* 格律雅析：五维雷达（纯数学极坐标）+ 平仄声律谱（平水韵算法） */}
      {metreReport?.ok && radarData?.ok && (
        <section className="poem-metre">
        <ReferenceCorners />
          <div className="poem-metre__head">
            <span className="poem-metre__mark">律</span>
            <span className="poem-metre__title">格律雅析</span>
            <span className="poem-metre__form">{metreReport.regulatedForm} · {metreReport.lineLength} 言 · {metreReport.lineCount} 句</span>
          </div>

          <div className="poem-metre__body">
            <div className="poem-metre__radar">
              <RadarChart
                dimensions={radarData.dimensions}
                activeKey={activeDimension}
                onHoverDimension={setActiveDimension}
                size={224}
              />
            </div>

            <ul className="poem-metre__dims">
              {radarData.dimensions.map((d) => (
                <li
                  key={d.key}
                  className={`poem-metre__dim${activeDimension === d.key ? ' is-active' : ''}`}
                  onPointerEnter={() => setActiveDimension(d.key)}
                  onPointerLeave={() => setActiveDimension(null)}
                >
                  <span className="poem-metre__dim-label">{d.label}</span>
                  <span className="poem-metre__dim-bar">
                    <i style={{ width: `${d.score}%` }} />
                  </span>
                  <span className="poem-metre__dim-score">{d.score}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="poem-metre__rationale">{radarData.rationale}</p>

          {/* 展开明细：为什么是这个分 */}
          <details className="poem-metre__details">
            <summary>评分依据明细（可展开）</summary>
            {radarData.dimensions.map((d) => (
              <div key={d.key} className="poem-metre__detail">
                <div className="poem-metre__detail-title">{d.label} · {d.score} 分</div>
                <ul>
                  {d.contributions.map((c, i) => (
                    <li key={i} className={c.ok ? 'is-ok' : 'is-weak'}>
                      {c.label}：{c.value}
                      <em>（权重 {Math.round(c.weight * 100)}%）</em>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </details>

          {/* 平仄声律谱 */}
          <div className="poem-metre__tones">
            <div className="poem-metre__tones-title">平仄声律谱 · 平水韵</div>
            <TonePattern report={metreReport} />
          </div>
        </section>
      )}

      {/* 功能按钮群 */}


      {/* 摘录成功：朱砂印章下压动效 */}
      {stamp && <div className="poem-stamp">已入卷</div>}
    </div>
  )
}

