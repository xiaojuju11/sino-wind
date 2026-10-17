import ReferenceCorners from '../components/ReferenceCorners'
import SceneHomeCard from '../components/SceneHomeCard'
import FrequencyHomeCard from '../components/FrequencyHomeCard'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../styles/home.less'
import { Toast, Popup, CenterPopup } from 'antd-mobile'
import { DownOutline, RightOutline, UpOutline, CheckCircleOutline, StarOutline, SearchOutline } from 'antd-mobile-icons'
import { CITY_DICT, autoDetectUserCity } from '../utils/ancientCities'   // 郑小君的逐城精编诗文 + IP 感知
import { useNavigate } from 'react-router-dom'
import InkParticleField from '../components/InkParticleField.jsx'
import InkSpreadZone from '../components/InkSpreadZone.jsx'
import axios from '../http'
import InkWashBackground from '../components/InkWashBackground'
import '../styles/referencePolish.less'
import '../styles/homeHarmony.less'
import { CITIES, searchCities } from '../utils/geoCities.js'
import { currentTerm, seasonLine, fetchWeather, locate } from '../utils/almanac.js'
import { SHICHEN, shichenOf } from '../utils/shichen.js'
import { playInkDropSound } from '../utils/guofengAudio.js'
// 《九州地名志 · 城邑春秋》已迁到独立二级页面（pages/CityChroniclePage.jsx），
// 本页不再需要 cityChronicle / NOT_FOUND_TIP / RECOMMEND_CITIES

const BASE = import.meta.env.BASE_URL

// ════════════════════════════════════════════════════
//  传统时辰换算（TRD v3.0：动态算法换算十二时辰）
//  2026-10-15：表已迁到 utils/shichen.js（补齐十二时辰雅称与养生雅事，
//  供《十二时辰养生与雅事》弹窗使用），此处委托给它，避免两处表不一致。
// ════════════════════════════════════════════════════
function getTraditionalTime(date = new Date()) {
  return shichenOf(date)
}

// ── 干支纪年 / 纪月（五虎遁：正月起寅，月干随年干推演）──
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

function getGanzhi(date = new Date()) {
  const year = date.getFullYear()
  const yGan = (((year - 4) % 10) + 10) % 10
  const yZhi = (((year - 4) % 12) + 12) % 12
  // 节气月支：寅月起（公历 2 月 ≈ 寅月）
  const month = date.getMonth() + 1
  const mZhi = month % 12
  const n = (month - 2 + 12) % 12 // 距寅月的序数
  const mGan = (yGan * 2 + 2 + n) % 10 // 五虎遁
  return {
    year: `${GAN[yGan]}${ZHI[yZhi]}年`,
    month: `${GAN[mGan]}${ZHI[mZhi]}月`,
  }
}

function getDateText(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${hh}:${mm}`
}

// 古今识物 · 示例体验（对齐设计稿两条）
// 图标走 TRD §2.3 第三优先级「CSS 印章」：朱砂印泥 + 单字古称，随主题着色
const SHIWU_DEMOS = [
  { id: 'naicha', seal: '酪', modern: '拍奶茶', ancient: '酪饮 / 酥签' },
  { id: 'shubao', seal: '笈', modern: '拍书包', ancient: '筒简 / 书笈' },
]

// 首屏预置的雅译范例（与后端离线典范库口径一致）
const YAYAN_PRESET = {
  ancient: '偷得浮生半日闲，竹杖芒鞋轻胜马。',
  author: '苏轼（化用风骨）',
  explanation: '清风怡情，信步幽林，极尽萧散之趣。',
}

// 漫游古今经典城邑库
// 2026-10-15：位置数据由写死的 6 城改为全国城邑库（utils/geoCities.js，339 城含经纬度
// 与有据可考的古称），并按浏览器/IP 定位自动选中所在城邑。原 6 城保留为精品覆盖
// （它们带专属诗句与物候），其余城邑按季节取句、按节气取物候。
const CLASSIC_CITIES = [
  { name: '杭州', ancient: '临安', temp: '24°', weather: '晴和', desc: '天朗气清，惠风和畅。', wuhou: '菊有黄华', text: '临安（杭州）· 水光潋滟晴方好' },
  { name: '开封', ancient: '汴京', temp: '19°', weather: '微风', desc: '烟柳画桥，风帘翠幕，参差十万人家。', wuhou: '草木黄落', text: '汴京（开封）· 烟柳画桥风帘幕' },
  { name: '西安', ancient: '长安', temp: '18°', weather: '清爽', desc: '春风得意马蹄疾，一日看尽长安花。', wuhou: '鸿雁来宾', text: '长安（西安）· 春风得意马蹄疾' },
  { name: '洛阳', ancient: '洛邑', temp: '20°', weather: '晴朗', desc: '洛阳地脉花最宜，牡丹尤为天下奇。', wuhou: '玄鸟归去', text: '洛阳（洛邑）· 地脉花宜满城香' },
  { name: '苏州', ancient: '姑苏', temp: '21°', weather: '薄雾', desc: '月落乌啼霜满天，江枫渔火对愁眠。', wuhou: '寒蝉鸣止', text: '姑苏（苏州）· 江枫渔火对愁眠' },
  { name: '南京', ancient: '金陵', temp: '23°', weather: '和煦', desc: '江南佳丽地，金陵帝王州。', wuhou: '水始涸', text: '金陵（南京）· 江南佳丽帝王州' },
]

// 城邑 → 展示字段
// 优先级：郑小君的逐城精编（CITY_DICT，含「兰渚流觞」这类物候雅称）
//      → 原 6 城精品覆盖（CLASSIC_CITIES）
//      → 按季节取句 + 按节气取物候（其余 290+ 城）
// 坐标、古称、真实气温一律来自 geoCities.js / almanac.js，不受本表影响。
function cityView(city) {
  const curated = CITY_DICT[city.name]
  const classic = CLASSIC_CITIES.find((c) => c.name === city.name)
  const line = seasonLine(new Date(), city.name)
  const label = city.ancient ? `${city.ancient}（${city.name}）` : city.name
  if (curated) {
    const ancient = city.ancient || curated.ancient || ''
    return {
      name: city.name,
      ancient,
      desc: curated.desc,
      wuhou: curated.wuhou,
      text: `${ancient ? `${ancient}（${city.name}）` : city.name} · ${curated.desc.slice(0, 12)}`,
    }
  }
  if (classic) return { ...classic }
  return {
    name: city.name,
    ancient: city.ancient || '',
    desc: `${line.line}——${line.author}《${line.title}》`,
    wuhou: currentTerm().hou,
    text: `${label} · ${line.line}`,
  }
}

export default function Home() {
  const navigate = useNavigate()
  // 题头元素引用：水墨粒子引擎的手势监听直接挂在这里（不新增遮挡层）
  const heroRef = useRef(null)
  const heroInkZoneRef = useRef(null)
  // 是否已由「留驻此时空」等手动操作接管城邑 —— 定位链路见到此标记即不再自动写入，
  // 避免 IP 定位稍后返回把用户刚选的城市覆盖掉（实测踩过）
  const manualPickRef = useRef(false)

  // 点击题头「华风」朱砂印章：激荡朱砂印泥水墨晕染
  const handleSealClick = (e) => {
    e.stopPropagation()
    if (!heroRef.current || !heroInkZoneRef.current) return
    const heroRect = heroRef.current.getBoundingClientRect()
    const sealRect = e.currentTarget.getBoundingClientRect()
    const x = sealRect.left - heroRect.left + sealRect.width / 2
    const y = sealRect.top - heroRect.top + sealRect.height / 2
    heroInkZoneRef.current.triggerBleed(x, y, 'cinnabar', 1.8)
    Toast.show({ content: '朱砂落印 · 雅意自生', duration: 1200 })
  }

  // ① 白话雅译
  const [inputText, setInputText] = useState('')
  const [translating, setTranslating] = useState(false)
  const [yayanResult, setYayanResult] = useState(YAYAN_PRESET)
  // 离线兜底标记（TRD_PHASE3 §3.3：保留本地名句兜底库；标记后按兜底文案呈现，不冒充 AI 生成）
  const [yayanOffline, setYayanOffline] = useState(false)

  // ② 时令天象（动态换算与漫游古今城邑）
  // currentCity 初值「临安（杭州）」，随后由定位结果替换
  const [currentCity, setCurrentCity] = useState(() => cityView({ name: '杭州', ancient: '临安', lat: 30.2741, lng: 120.1551 }))
  const [cityCoords, setCityCoords] = useState({ lat: 30.2741, lng: 120.1551 })
  const [visibleCitySheet, setVisibleCitySheet] = useState(false)
  const [cityQuery, setCityQuery] = useState('')
  const [locatedBy, setLocatedBy] = useState('')   // '' | 'gps' | 'ip' | 'default' | 'manual'
  const locationRequest = useRef(null)
  const [weather, setWeather] = useState(undefined)   // 真实气温：undefined=取数中，对象=成功，null=失败

  // ②-2 《十二时辰养生与雅事》弹窗
  const [shichenOpen, setShichenOpen] = useState(false)
  // 打开时自动滑到「当前时辰」那张卡（亥时在最右，不滑过去看不见）。
  // 用直接设置 scrollLeft 而非 scrollIntoView —— 后者会被 Popup 的打开动画打断，
  // 且会连带滚动祖先容器（实测无效：scrollLeft 仍为 12）。
  const shichenStripRef = useRef(null)
  useEffect(() => {
    if (!shichenOpen) return
    const timer = setTimeout(() => {
      const strip = shichenStripRef.current
      const el = strip?.querySelector('.home-shichen__card.is-now')
      if (!strip || !el) return
      strip.scrollLeft = el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2
    }, 400)
    return () => clearTimeout(timer)
  }, [shichenOpen])

  // 当前时间：原文这三个值只在首次渲染时算一次，时间会冻在打开页面的那一刻
  // （实测：21:55 仍显示 21:53）。改为状态 + 每分钟推进，时间/时辰/物候都会跟着走。
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])
  const curShichen = getTraditionalTime(now)
  const ganzhi = getGanzhi(now)
  const dateText = getDateText(now)

  // 定位已合并到下方单一 effect（autoDetectUserCity 优先 → locate() 兜底）

  // 真实气温：随选中城邑的经纬度取数
  // 三态：undefined=取数中（显示「…」）｜对象=成功｜null=失败（显示「—」）
  useEffect(() => {
    const ac = new AbortController()
    let alive = true
    setWeather(undefined)
    fetchWeather(cityCoords.lat, cityCoords.lng, ac.signal).then((w) => { if (alive) setWeather(w) })
    return () => { alive = false; ac.abort() }
  }, [cityCoords])

  // 城邑搜索（今名与古称都能搜到）
  const cityOptions = useMemo(() => searchCities(cityQuery).slice(0, 80), [cityQuery])

  // 选中城邑：更新展示 + 切到该城经纬度（触发真实气温重取）
  const pickCity = (city) => {
    manualPickRef.current = true            // 标记为手动选择，定位链路不再覆盖
    locationRequest.current?.abort()        // 同时中止在途的定位请求（主干新增）
    setCurrentCity(cityView(city))
    setCityCoords({ lat: city.lat, lng: city.lng })
    setLocatedBy('manual')
    setVisibleCitySheet(false)
    setCityQuery('')
    Toast.show({ content: `已漫游至${city.ancient ? `${city.ancient}（${city.name}）` : city.name}` })
  }

  // 气温/天气显示
  // ⚠️ 取数中或失败时**不回落到城邑内置的写死值**（如 '18°'）——
  // 那是字符串常量而非实时气温，展示出来等于报假数据（用户会误以为是当前气温）。
  // 三态：weather === undefined → 取数中（「…」）；为对象 → 真实气温；为 null → 失败（「—」）
  const wx = weather === undefined
    ? { temp: '…', weather: '' }
    : weather
      ? { temp: weather.tempText, weather: weather.weather }
      : { temp: '—', weather: '' }

  // ──《九州地名志 · 城邑春秋》──
  // 2026-10-16 由底部弹窗改为独立二级页面（/city-chronicle）。
  // 交接方式说明（实测踩过的坑）：
  //   原用 window 自定义事件回传，但该页是在 navigate() 之前同步派发事件的 ——
  //   那一刻 Home 尚未挂载，监听器还不存在，事件直接丢失（实测：留驻成都后
  //   首页仍是香港）。故改为**本页挂载时读取 sessionStorage**，与挂载时序无关。
  //   sessionStorage 仅在切换/刷新时仍保留，故读后立即清除，避免下次误触发。
  /** 进入城邑志页：把当前城邑带过去，页面打开即展示它（同原弹窗行为） */
  const openChronicle = useCallback(() => {
    try { sessionStorage.setItem('city-chronicle:from', currentCity.name || '') } catch { /* 无 storage 时忽略 */ }
    navigate('/city-chronicle')
  }, [currentCity.name, navigate])

  /** 把时令卡片切到指定城邑（左栏气温重取、右栏古称与诗句联动刷新） */
  const applyCity = useCallback((target) => {
    const name = String(target || '').trim()
    if (!name) return
    const rec = CITIES.find((c) => c[0] === name || c[0].startsWith(name))
    if (!rec) { Toast.show({ content: '城外云深，暂未收录此邑' }); return }
    locationRequest.current?.abort()
    const city = { name: rec[0], ancient: rec[4] || '', lat: rec[2], lng: rec[3] }
    setCurrentCity(cityView(city))
    setCityCoords({ lat: city.lat, lng: city.lng })
    setLocatedBy('manual')
    Toast.show({ content: `已留驻${city.ancient ? `${city.ancient}（${city.name}）` : city.name}` })
  }, [])

  // 挂载时消费「留驻此时空」待处理项（由城邑志页写入）
  // ⚠️ 竞态（实测踩过）：本 effect 与下方 IP 定位 effect 都在挂载时跑 ——
  //    若先应用了留驻城邑，IP 定位稍后返回会把它**覆盖掉**（留驻成都却仍显示香港）。
  //    故用 ref 记录「已由手动留驻接管」，定位链路见到该标记即放弃自动写入。
  useEffect(() => {
    let pending = ''
    try {
      pending = sessionStorage.getItem('city-chronicle:commit') || ''
      if (pending) sessionStorage.removeItem('city-chronicle:commit')
    } catch { /* 无 storage 时忽略 */ }
    if (pending) { manualPickRef.current = true; applyCity(pending) }
    // 兜底：同页内若仍有事件派发（例如将来改为不跳转的调用方），一并支持
    const onCommit = (e) => { manualPickRef.current = true; applyCity(e?.detail?.name) }
    window.addEventListener('city-chronicle:commit', onCommit)
    return () => window.removeEventListener('city-chronicle:commit', onCommit)
  }, [applyCity])

  // 🏮 自动感知驻足之地（合并说明 2026-10-15）
  // 原有两个并行实现互相竞争：郑小君的 autoDetectUserCity()（IP + 12h 缓存，
  // 带古称与精编诗文）与我的 locate()（GPS → IP → 默认北京，带真实经纬度）。
  // 合并为一条链路：以 autoDetectUserCity 作首选（含缓存，首屏不闪），
  // 命中则用其城名配我的经纬度并套用 cityView 的精品文案；
  // 未命中或失败再走 locate() 的 GPS/IP 链路。
  // 关键：无论走哪条，都必须同步 cityCoords —— 否则真实气温会一直用初值杭州。
  useEffect(() => {
    const ac = new AbortController()
    locationRequest.current = ac
    let alive = true
    ;(async () => {
      let city = null
      let source = 'default'
      try {
        const detected = await autoDetectUserCity(ac.signal)
        if (!alive || ac.signal.aborted) return
        // 两道校验后才采用 IP 定位结果：
        //  ① 城名可读 —— 2026-10-16 起主干已把数据源从 whois.pconline（无 CORS + GBK）
        //     换成 ipwho.is（HTTPS + CORS + UTF-8），乱码根因已消除；此处保留作兜底，
        //     防止将来再接入 GBK 数据源时把乱码城市名写进 12 小时缓存。
        //  ② 城名必须能落到本项目的城邑库（CITIES，359 城）—— 这条更常触发：
        //     实测本机 IP 被判为海外，ipwho.is 返回「新加坡」，虽可读但库中无此邑，
        //     不拦就会得到「九州·新加坡」这类兜底文案。落空则改走下方 locate()。
        const name = detected?.name || ''
        const readable = name && !/[\uFFFD]|[^\u4e00-\u9fa5A-Za-z0-9·\-\s]/.test(name)
        if (readable) {
          // 按名回填经纬度（他的库是名称型，我的库是坐标型）
          const rec = CITIES.find((c) => c[0] === name || c[0].startsWith(name))
          if (rec) { city = { name: rec[0], ancient: rec[4] || detected.ancient || '', lat: rec[2], lng: rec[3] }; source = 'ip' }
        }
      } catch { /* 继续走 locate() 兜底 */ }
      if (!alive || ac.signal.aborted) return
      if (!city) {
        const r = await locate(ac.signal)
        if (!alive || ac.signal.aborted) return
        city = r.city
        source = r.source
      }
      if (!alive || ac.signal.aborted) return
      // 若期间用户已手动留驻某城邑，则放弃自动定位结果（避免覆盖用户选择）
      if (manualPickRef.current) return
      setCurrentCity(cityView(city))
      setCityCoords({ lat: city.lat, lng: city.lng })
      setLocatedBy(source)
    })()
    return () => { alive = false; ac.abort(); if (locationRequest.current === ac) locationRequest.current = null }
  }, [])

  // 白话雅译请求（接口与字段保持不变）
  const handleTranslate = async (textToTranslate) => {
    const text = (textToTranslate || inputText).trim()
    if (!text) {
      Toast.show({ content: '请先挥毫输入一句白话' })
      return
    }
    setTranslating(true)
    try {
      const res = await axios.post('/api/deepseek/yayan', { text })
      const data = res?.data?.data
      if (data && data.ancient) {
        setYayanResult(data)
        // 后端离线典范库命中 / 上游异常兜底时按兜底文案标注
        setYayanOffline(res.data.degraded === true || res.data.source === 'local-fallback')
      } else {
        throw new Error('yayan: empty payload')
      }
    } catch {
      // 长文本防御的最后一环：请求失败时不得遗留「上一句」雅言，避免张冠李戴
      // 故清空译文（结果卡与「摘录入卷」一并置灰），只留古风提示
      setYayanResult(null)
      setYayanOffline(true)
      Toast.show({ content: '墨迹暂凝，未得雅言，请再试一次' })
    } finally {
      setTranslating(false)
    }
  }

  // 摘录入卷（写入本地 gufeng_yayan_list）
  const handleCollectYayan = () => {
    if (!yayanResult) return
    try {
      const saved = JSON.parse(localStorage.getItem('gufeng_yayan_list') || '[]')
      saved.unshift({
        id: Date.now(),
        // 数据契约（TRD_PHASE3 依据 PHASE3_CHANGES §2.1）：{ id, modern, ancient, author, explanation }
        modern: (yayanResult.modern || inputText || '').trim(),
        ancient: yayanResult.ancient,
        author: yayanResult.author,
        explanation: yayanResult.explanation,
        offline: yayanOffline, // 兜底来源标记，书斋列表可据此不以「AI 生成」呈现
        createdAt: new Date().toLocaleDateString(),
      })
      localStorage.setItem('gufeng_yayan_list', JSON.stringify(saved))
      playInkDropSound()
      Toast.show({ content: '已摘录入墨隐书斋 · 雅译锦囊', icon: 'success' })
    } catch {
      Toast.show({ content: '摘录未保存，本机存储不可用，请稍后重试', icon: 'fail' })
    }
  }

  return (
    <div className="home-root reference-polish">
      <InkWashBackground />

      {/* ── 水墨流体粒子引擎（Canvas 物理引擎：落叶/流萤/烟雨/飞雪 + 划动水墨扩散）── */}
      <InkParticleField interactionTarget={heroRef} />

      {/* ── 题头：云山竹简 + 朱砂印「华风」+ 副标 + 右上角日月/设置 ── */}
      <header className="home-hero is-ink-zone" ref={heroRef}>
        {/* 题头局部宣纸水墨晕染层 */}
        <InkSpreadZone ref={heroInkZoneRef} targetRef={heroRef} color="ink" />

        <div className="home-hero__actions">
          <button
            type="button"
            className="home-hero__icon-btn"
            aria-label="设置"
            onClick={() => navigate('/accountSetting')}
          >
            {/* 图标铁律：iconfont 基础库矢量图标 */}
            <i className="iconfont icon-shezhi" aria-hidden="true"></i>
          </button>
        </div>

        <div className="home-hero__title-row">
          <h1 className="home-hero__title">云山竹简</h1>
          <span
            className="home-hero__seal"
            onClick={handleSealClick}
            title="点击落印 · 激荡朱砂印泥"
            role="button"
            tabIndex={0}
          >
            华风
          </span>
        </div>
        <p className="home-hero__sub">—— 读千年风雅 与君共此山河 ——</p>
      </header>

      {/* ── 核心主线体验：寻镜入诗（首屏最核心展示与交互）── */}
      <SceneHomeCard />

      {/* ── 四维诗境辅助研习系统分界 ── */}
      <div className="home-supporting-divider">
        <div className="home-supporting-divider__line" />
        <div className="home-supporting-divider__badge">
          <span className="home-supporting-divider__icon">📜</span>
          <span>四维诗境辅助研习系统</span>
        </div>
        <div className="home-supporting-divider__line" />
      </div>
      <p className="home-supporting-sub">
        围绕「实景诗词」提供意象今译、景地物候、名物考释与声律推演支持
      </p>

      {/* ── 区块① 白话雅译（意象今译辅助）── */}
      <section className="home-card-scroll home-yayan-section">
        <img className="home-yayan-art" src={`${BASE}images/frequency/yayan-desk-v1.webp`} alt="" aria-hidden="true" />
        <ReferenceCorners />
        <div className="home-section-header">
          <div className="home-section-title-wrap">
            <span className="home-section-category">辅助 ① · 意象今译</span>
            <h2 className="home-section-title">白话雅译</h2>
          </div>
          <span className="home-section-seal">译</span>
        </div>

        <div className="home-yayan-scroll">
          <div className="home-yayan-inner">
            <div className="home-yayan-input-box">
              <span className="home-yayan-pencil" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
                  <path d="M7.2 14.4c-1.4 0-2.5 1.1-2.5 2.5 0 1.1-.9 1.7-.8 1.7.8 0 2.1-.3 2.9-1 .5-.5.7-1 .8-1.5l9.2-9.2c.4-.4.4-1 0-1.4l-1.5-1.5c-.4-.4-1-.4-1.4 0L7.2 14.4z" />
                </svg>
              </span>
              <textarea
                className="home-yayan-textarea"
                rows={1}
                maxLength={150}
                placeholder="输入日常白话，如：心情真好…"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <span className={`home-yayan-counter${inputText.length >= 150 ? ' is-limit' : ''}`}>{inputText.length}/150</span>
            </div>

            <div className="home-yayan-divider" aria-hidden="true">
              <span className="home-yayan-divider__arrow">
                <DownOutline />
              </span>
            </div>

            {yayanResult && (
              <div className="home-yayan-result-card">
                <p className="home-yayan-ancient-text">
                  {yayanResult.ancient}
                </p>
                <p className="home-yayan-explain"><span className="home-yayan-explain__label">文言释义：</span>{yayanResult.explanation}</p>
                <p className="home-yayan-author">—— {yayanResult.author}</p>
                {yayanOffline && (
                  <p className="home-yayan-offline-line">
                    <span className="home-yayan-offline">离线典范</span>
                  </p>
                )}
              </div>
            )}

            <div className="home-yayan-btn-row">
              <button
                type="button"
                className="home-yayan-submit-btn"
                disabled={translating}
                onClick={() => handleTranslate()}
              >
                {translating ? (
                  '先贤研墨中…'
                ) : (
                  <>
                    <CheckCircleOutline className="home-yayan-btn-icon" />
                    译为雅言
                  </>
                )}
              </button>
              <button
                type="button"
                className="home-yayan-collect-btn"
                disabled={!yayanResult}
                onClick={handleCollectYayan}
              >
                {/* 图标铁律：iconfont 基础库「书本」图标 */}
                <i className="iconfont icon-shuben home-yayan-btn-icon" aria-hidden="true"></i>
                摘录入卷
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 区块② 古今时令与天象 ── */}
      <section className="home-card-scroll home-almanac">
        <ReferenceCorners />
        <div className="home-section-header">
          <div className="home-section-title-wrap">
            <span className="home-section-category">辅助 ② · 景地物候</span>
            <h2 className="home-section-title">古今时令与天象</h2>
          </div>
          <span className="home-section-seal">时</span>
        </div>
        <p className="home-section-sub">定位摄景地之古称地志、实时天象与二十四节气物候。</p>

        <div className="home-almanac__cols">
          <div className="home-almanac__col">
            <span className="home-almanac__label">现代 · 今日</span>
            <div className="home-almanac__weather">
              {/* 真实气温（Open-Meteo，按选中城邑经纬度取数） */}
              <span className="home-almanac__temp">{wx.temp}</span>
            </div>
            <p
              className="home-almanac__city"
              onClick={openChronicle}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
            >
              <span className="home-almanac__city-text" title={currentCity.ancient ? `${currentCity.ancient}（${currentCity.name}）` : currentCity.name}>
                {currentCity.ancient ? `${currentCity.ancient}（${currentCity.name}）` : currentCity.name}
              </span>
              {/* 定位来源以极小字附在城市名后，不新占一行（保持左右两栏对称） */}
              {locatedBy === 'gps' && <em className="home-almanac__loc">已定位</em>}
              {locatedBy === 'ip' && <em className="home-almanac__loc">网络定位</em>}
              <DownOutline className="home-almanac__caret" />
            </p>
            <p className="home-almanac__date">{dateText}</p>
          </div>

          <div className="home-almanac__col">
            <span className="home-almanac__label">古代 · 时令</span>
            {/* 时辰可点：打开《十二时辰养生与雅事》 */}
            <p
              className="home-almanac__shichen"
              onClick={() => setShichenOpen(true)}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
            >
              {curShichen.name}
              <DownOutline className="home-almanac__caret" />
              {/* 修正历史 bug：后缀原写死「日映」且不随时间变；现按真实时间显示雅称（亥时→人定） */}
              <em className="home-almanac__shichen-suffix">· {curShichen.alias}</em>
            </p>
            <p className="home-almanac__ganzhi">
              {ganzhi.year} {ganzhi.month} {curShichen.name}
            </p>
            <p className="home-almanac__desc">{currentCity.desc}</p>
            <p className="home-almanac__wuhou">
              {/* 图标铁律：物候改 CSS 印章「菊」/ 依城而定（原花卉 Emoji 已消灭） */}
              <span className="home-almanac__wuhou-seal" aria-hidden="true">{currentCity.wuhou.slice(0, 1)}</span>
              <span className="home-almanac__wuhou-label">物候：</span>{currentCity.wuhou}
            </p>
          </div>
        </div>
      </section>

      {/* ── 区块③ 古今识物 ── */}
      <section className="home-card-scroll home-shiwu-section">
        <ReferenceCorners />
        <div className="home-section-header">
          <div className="home-section-title-wrap">
            <span className="home-section-category">辅助 ③ · 名物考释</span>
            <h2 className="home-section-title">古今识物</h2>
          </div>
          <span className="home-section-seal">物</span>
        </div>
        <p className="home-section-sub">识读诗境中遇见的古今器物、文房器具与名物渊源。</p>

        <div className="home-shiwu-body">
          <button
            type="button"
            className="home-shiwu-upload"
            onClick={() => navigate('/recognition')}
          >
            {/* 图标铁律：iconfont 基础库「相机」图标 */}
            <i className="iconfont icon-xiangji home-shiwu-upload__icon" aria-hidden="true"></i>
            <span className="home-shiwu-upload__title">上传/拍摄现代物品</span>
            <span className="home-shiwu-upload__desc">探索现代物品古代雅称</span>
          </button>

          <div className="home-shiwu-demo">
            <p className="home-shiwu-demo__title">
              {/* 图标铁律：示例前缀 `↗` 改 antd 矢量图标 UpOutline（东北向箭头，视觉等效） */}
              <UpOutline className="home-shiwu-demo__title-icon" />
              示例体验（点击试试）
            </p>
            {SHIWU_DEMOS.map((item) => (
              <button
                key={item.modern}
                type="button"
                className="home-shiwu-demo__item"
                onClick={() => navigate(`/recognition?preset=${item.id}`)}
              >
                <span className="home-shiwu-demo__seal" aria-hidden="true">{item.seal}</span>
                <span className="home-shiwu-demo__modern">{item.modern}</span>
                <span className="home-shiwu-demo__flow-arrow" aria-hidden="true">→</span>
                <span className="home-shiwu-demo__ancient">{item.ancient}</span>
                <RightOutline className="home-shiwu-demo__chevron" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 区块④ 古诗词赏析 ── */}
      <section
        className="home-card-scroll home-poem-card"
        onClick={() => navigate('/poem')}
        role="button"
        tabIndex={0}
      >
        <ReferenceCorners />
        <div className="home-section-header">
          <div className="home-section-title-wrap">
            <span className="home-section-category">辅助 ④ · 声律进阶</span>
            <h2 className="home-section-title">古诗词赏析与飞花雅令</h2>
          </div>
          <span className="home-section-seal">词</span>
        </div>
        <p className="home-section-sub">106部平水韵有限状态机，推演律绝平仄与诗境对仗。</p>

        <div className="home-poem-body">
          <p className="home-poem-title">《定风波·莫听穿林打叶声》</p>
          <p className="home-poem-meta">宋代 · 苏轼</p>
          <div className="home-poem-verses">
            <p>一蓑烟雨任平生，</p>
            <p>也无风雨也无晴。</p>
          </div>
          {/* 展卷细读：原为圆形箭头图标，改为带文字的可读按钮。
              合并说明：主干同期也做了同名改动，但其实现用 <div aria-label> —— 
              不可键盘聚焦、语义不正确；此处保留 <button>，子元素沿用主干的
              __text / __icon 类名，以套用其在 referenceFidelity.less 中的样式。 */}
          <button
            type="button"
            className="home-poem-more"
            onClick={() => navigate('/poem')}
          >
            <span className="home-poem-more__text">展卷细读</span>
            <RightOutline className="home-poem-more__icon" aria-hidden="true" />
          </button>
        </div>
      </section>

      <FrequencyHomeCard />

      {/* ── 漫游古今城邑抽屉（全国城邑，可搜今名或古称）── */}
      <Popup
        visible={visibleCitySheet}
        onMaskClick={() => setVisibleCitySheet(false)}
        onClose={() => { setVisibleCitySheet(false); setCityQuery('') }}
        bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', maxHeight: '72vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="home-citysheet">
          <div className="home-citysheet__head">
            <strong>漫游古今城邑</strong>
            <button type="button" onClick={() => { setVisibleCitySheet(false); setCityQuery('') }} aria-label="收起">收起</button>
          </div>
          <label className="home-citysheet__search">
            <SearchOutline aria-hidden="true" />
            <input
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              placeholder="输入今名或古称，如「成都」「锦官城」"
              autoComplete="off"
            />
          </label>
          <div className="home-citysheet__list">
            {cityOptions.length === 0 && <p className="home-citysheet__empty">未寻得此城，换个名字试试</p>}
            {cityOptions.map((c) => (
              <button
                key={`${c.province}-${c.name}`}
                type="button"
                className={`home-citysheet__item${c.name === currentCity.name ? ' is-current' : ''}`}
                onClick={() => pickCity(c)}
              >
                <span className="home-citysheet__name">
                  {c.ancient ? `${c.ancient}（${c.name}）` : c.name}
                </span>
                <span className="home-citysheet__prov">{c.province}</span>
              </button>
            ))}
          </div>
          <p className="home-citysheet__foot">共收录 {CITIES.length} 城 · 古称仅列有史料可考者</p>
        </div>
      </Popup>

      {/* ── 《十二时辰养生与雅事》：居中宣纸画卷弹窗 ── */}
      <CenterPopup
        visible={shichenOpen}
        onMaskClick={() => setShichenOpen(false)}
        onClose={() => setShichenOpen(false)}
        showCloseButton={false}
        className="home-shichen-popup"
      >
        <div className="home-shichen home-shichen--modal">
          <ReferenceCorners />
          <div className="home-shichen__head">
            <strong>十二时辰养生与雅事</strong>
            <button type="button" onClick={() => setShichenOpen(false)} aria-label="收起">收起</button>
          </div>
          <p className="home-shichen__now">
            此刻 · <b>{curShichen.alias} · {curShichen.name}</b>
            <em>{curShichen.range}</em>
          </p>
          <div className="home-shichen__strip" ref={shichenStripRef}>
            {SHICHEN.map((s) => (
              <article
                key={s.name}
                className={`home-shichen__card${s.name === curShichen.name ? ' is-now' : ''}`}
              >
                <span className="home-shichen__alias">{s.alias}</span>
                <span className="home-shichen__name">{s.name}</span>
                <span className="home-shichen__range">{s.range}</span>
                <span className="home-shichen__life">{s.life}</span>
                <span className="home-shichen__health">养：{s.health}</span>
                <span className="home-shichen__affair">雅：{s.affair}</span>
              </article>
            ))}
          </div>
          <p className="home-shichen__foot">左右滑动，遇见十二时辰 · 今人所行，古人亦有节候</p>
        </div>
      </CenterPopup>
    </div>
  )
}
