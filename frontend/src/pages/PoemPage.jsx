import '../styles/poem.less'
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

const BASE = import.meta.env.BASE_URL
const asset = (name) => `${BASE}assets/${name}`

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
  const [playingMusic, setPlayingMusic] = useState(false)
  const appreciateRef = useRef(null)

  // 雅乐聆音：古琴五声音阶纯浏览器合成（宫商角徵羽，免版权困扰）
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

  // 底部「诗意赏析」按钮：展开并滚动到赏析面板（避免与折叠条产生交互歧义）
  const toggleAppreciation = () => {
    setShowAppreciation((open) => {
      const next = !open
      if (next) {
        setTimeout(() => appreciateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120)
      }
      return next
    })
  }

  // 拉取随机诗词（失败自动降级到本地诗库）
  const loadRandom = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/poem/random')
      const data = res?.data?.data
      if (data && data.title) {
        setPoem({
          id: data.id || data.poemId || `poem_${Date.now()}`,
          title: data.title,
          author: data.author,
          dynasty: data.dynasty || '古代',
          paragraphs: toParagraphs(data.paragraphs || data.content),
          appreciation: data.appreciation || '',
          bgArt: data.bgArt || '',
        })
      } else {
        throw new Error('empty')
      }
    } catch {
      // 后端未就绪 / 网络异常：优雅降级
      const pick = MOCK_POEMS[Math.floor(Math.random() * MOCK_POEMS.length)]
      setPoem(pick)
    } finally {
      setLoading(false)
      setShowAppreciation(false)
    }
  }, [])

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
    setPoem({
      id: item.id || `poem_${Date.now()}`,
      title: item.title,
      author: item.author,
      dynasty: item.dynasty || '古代',
      paragraphs: toParagraphs(item.paragraphs || item.content || item.snippet),
      appreciation: item.appreciation || '',
    })
    setResults(null)
    setKeyword('')
    setShowAppreciation(false)
  }

  // 摘录入卷（收藏）：朱砂印章动效 + 落库
  const handleCollect = async () => {
    if (!poem || collecting) return
    if (!localStorage.getItem('token')) {
      Toast.show({ content: '请先入席登录，方可摘录入卷' })
      return
    }
    setStamp(true)
    setTimeout(() => setStamp(false), 1100)
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
      // 响应拦截器已统一提示错误
    } finally {
      setCollecting(false)
    }
  }

  const lines = useMemo(() => poem?.paragraphs?.filter(Boolean) || [], [poem])

  return (
    <div className="poem-root" style={{ backgroundImage: `url(${asset('home/bg-paper.jpg')})` }}>
      {/* 顶部：返回 + 标题 */}
      <header className="poem-header">
        <div className="poem-header__back" onClick={() => navigate('/home')}>
          <LeftOutline />
        </div>
        <h1 className="poem-header__title">古诗词天地</h1>
        <div className="poem-header__placeholder" />
      </header>

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
          {searching && <div className="poem-results__loading">墨迹研开中……</div>}
          {!searching && results.length === 0 && (
            <div className="poem-results__empty">未寻得相关诗篇，换一关键字再试</div>
          )}
          {!searching &&
            results.map((item) => (
              <div className="poem-results__item" key={item.id || item.title} onClick={() => handlePickResult(item)}>
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

      {/* 宣纸诗卷主体 */}
      <section className="poem-scroll">
        {poem?.bgArt && (
          <span className="poem-scroll__watermark" style={{ backgroundImage: `url(${poem.bgArt})` }} />
        )}

        {loading || !poem ? (
          /* 加载态：与主卡同尺寸的宣纸灰骨架占位（不用圆形转圈，避免版式跳动） */
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

      {/* 诗意赏析折叠面板 */}
      <section className={`poem-appreciation ${showAppreciation ? 'is-open' : ''}`} ref={appreciateRef}>
        <div className="poem-appreciation__head" onClick={() => setShowAppreciation(!showAppreciation)}>
          <ContentOutline className="poem-appreciation__icon" />
          诗意赏析
          <DownOutline className="poem-appreciation__toggle" />
        </div>
        <div className="poem-appreciation__body">
          {poem?.appreciation || '此篇赏析尚待补录，先贤墨迹整理中……'}
        </div>
      </section>

      {/* 四大功能按钮（全量矢量图标） */}
      <section className="poem-actions">
        <button className="poem-action poem-action--primary" type="button" onClick={loadRandom}>
          <RedoOutline />
          换一首
        </button>

        <button className="poem-action poem-action--primary" type="button" onClick={handleCollect} disabled={collecting}>
          <HeartOutline />
          摘录入卷
        </button>

        <button
          className={`poem-action ${playingMusic ? 'poem-action--primary' : 'poem-action--ghost'}`}
          type="button"
          onClick={() => {
            setPlayingMusic(true)
            playGuqinArpeggio()
            Toast.show({ content: '🎶 琴韵绕梁，静听松风' })
            setTimeout(() => setPlayingMusic(false), 2600)
          }}
        >
          <SoundOutline />
          {playingMusic ? '琴韵绕梁…' : '听琴品韵'}
        </button>

        <button
          className="poem-action poem-action--ghost"
          type="button"
          onClick={toggleAppreciation}
        >
          <ContentOutline />
          诗意赏析
        </button>

        <button className="poem-action poem-action--ghost" type="button" onClick={() => navigate('/home')}>
          <LeftOutline />
          返回雅集
        </button>
      </section>

      {/* 摘录成功：朱砂印章下压动效 */}
      {stamp && <div className="poem-stamp">已入卷</div>}
    </div>
  )
}
