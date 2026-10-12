import '../styles/home.less'
import HomeCard from '../components/HomeCard'
import { useEffect, useState } from 'react'
import { Toast } from 'antd-mobile'
import { DownOutline } from 'antd-mobile-icons'
import axios from '../http'

const BASE = import.meta.env.BASE_URL
const asset = (name) => `${BASE}assets/home/${name}`

// 🪶 每日诗签降级数据（接口不可用时保证首页永不空白）
const FALLBACK_POEM = {
  verse: ['山水之乐，', '在乎山水之间也。'],
  from: '—— 欧阳修《醉翁亭记》',
  seal: '醉翁',
  art: asset('poem-art.jpg'),
}

// 兼容后端两种字段口径：contract 的 paragraphs[] 与实现里的 content[] / content 字符串
function toParagraphs(source) {
  if (!source) return []
  if (Array.isArray(source)) return source.filter((line) => typeof line === 'string' && line.trim())
  if (typeof source === 'string') {
    return source
      .split(/(?<=[。！？；])/)
      .map((line) => line.trim())
      .filter(Boolean)
  }
  return []
}

// 卷轴版面容纳两行，超长句做省略（完整诗篇见【古诗词天地】）
function clip(text, max = 16) {
  const value = String(text || '')
  return value.length > max ? `${value.slice(0, max)}…` : value
}

const almanac = {
  city: '杭州',
  temp: '24°',
  weather: '多云 空气优',
  lunar: '农历 三月廿六',
  ganzhi: '乙巳年 庚辰月 丙午日',
  term: '清明',
  termDesc: ['万物清明', '春和景明'],
}

// 四大核心雅席入口（2×2 宫格）：左文右图
const yajiEntries = [
  { key: 'appraise', title: '博古识器', desc: ['识古今之器', '赏华夏之美'], art: asset('yaji-appraise.jpg'), path: '/recognition' },
  { key: 'debate', title: '先贤论道', desc: ['与李白苏轼', '共话千年风骨'], art: asset('yaji-debate.jpg'), path: '/ai-chat' },
  { key: 'poem', title: '飞花诗令', desc: ['以诗会友', '飞花成令'], art: asset('yaji-poem.jpg'), path: '/poem' },
  {
    key: 'leisure',
    title: '四般闲事',
    desc: ['焚香品茗', '插花弄趣'],
    art: asset('yaji-leisure.jpg'),
    // 阶段二：四般闲事（焚香/点茶/挂画/插花）功能筹备中，暂以古风 Toast 提示，不再跳转个人中心
    onClick: () => Toast.show({ content: '焚香点茶筹备中，静候雅聚', duration: 2000 }),
  },
]

export default function Home() {
  const [poem, setPoem] = useState(FALLBACK_POEM)

  // 每日诗签：挂载请求真实接口（静默降级，不打扰用户）
  useEffect(() => {
    let alive = true
    const api = axios.defaults.baseURL || ''
    fetch(`${api}/api/poem/random`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const data = json?.data
        if (!alive || json?.code !== 1 || !data?.title) return
        const lines = toParagraphs(data.paragraphs || data.content)
        if (!lines.length) return
        setPoem({
          verse: lines.slice(0, 2).map((line) => clip(line)),
          from: `—— ${data.dynasty ? `${data.dynasty} · ` : ''}${data.author}《${data.title}》`,
          seal: String(data.author || '诗签').slice(0, 3),
          art: data.bgArt || asset('poem-art.jpg'),
        })
      })
      .catch(() => {
        /* 静默降级：保留 FALLBACK_POEM */
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="home-root" style={{ backgroundImage: `url(${asset('bg-paper.jpg')})` }}>
      {/* 顶部题头 */}
      <header className="home-hero">
        <div className="home-hero__title-row">
          <h1 className="home-hero__title">云山竹简</h1>
          <span className="home-hero__seal">华风</span>
        </div>
        <p className="home-hero__sub">读千年风雅 与君共此山河</p>
      </header>

      {/* 每日诗签 · 展开式横向卷轴（两端木轴） */}
      <section className="home-poem">
        <span className="home-poem__roller" />
        <div className="home-poem__tag">每日诗签</div>

        <div className="home-poem__body">
          <p className="home-poem__verse">
            {poem.verse.map((line, index) => (
              <span key={`${line}-${index}`}>{line}</span>
            ))}
            <i className="home-poem__seal">{poem.seal}</i>
          </p>
          <p className="home-poem__from">{poem.from}</p>
        </div>

        <div className="home-poem__art" style={{ backgroundImage: `url(${poem.art})` }} />
        <span className="home-poem__roller home-poem__roller--right" />
      </section>

      {/* 岁时节气与干支物候 */}
      <section className="home-almanac">
        <div className="home-almanac__col home-almanac__col--weather">
          <p className="home-almanac__city">
            {almanac.city}
            {/* 图标铁律：统一使用 antd-mobile-icons 矢量图标，禁用原生下拉字符 */}
            <DownOutline className="home-almanac__caret" />
          </p>
          <div className="home-almanac__weather">
            <svg className="home-almanac__icon" viewBox="0 0 32 32" aria-hidden="true">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
              <path d="M20 24c3.3 0 6-2.2 6-5s-2.7-5-6-5c-1.4 0-2.7.4-3.7 1.2" />
            </svg>
            <span className="home-almanac__temp">{almanac.temp}</span>
          </div>
          <p className="home-almanac__desc">{almanac.weather}</p>
        </div>

        <div className="home-almanac__col home-almanac__col--lunar">
          <p className="home-almanac__lunar">{almanac.lunar}</p>
          <p className="home-almanac__ganzhi">{almanac.ganzhi}</p>
        </div>

        <div className="home-almanac__col home-almanac__col--term">
          <p className="home-almanac__term">
            {almanac.term}
            <i className="home-almanac__seal">华风</i>
          </p>
          <p className="home-almanac__term-desc">
            {almanac.termDesc.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
        </div>
      </section>

      {/* 四大核心雅席入口 */}
      <section className="home-grid">
        {yajiEntries.map((item) => (
          <HomeCard key={item.key} item={item} />
        ))}
      </section>
    </div>
  )
}
