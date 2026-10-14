import ReferenceCorners from '../components/ReferenceCorners'
import React, { useRef, useState } from 'react'
import '../styles/home.less'
import { Toast, ActionSheet } from 'antd-mobile'
import { DownOutline, RightOutline, UpOutline, CompassOutline, EditSOutline, CheckCircleOutline, DownCircleOutline, StarOutline, ShopbagOutline, FileOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/useTheme'
import InkParticleField from '../components/InkParticleField.jsx'
import InkSpreadZone from '../components/InkSpreadZone.jsx'
import axios from '../http'
import InkWashBackground from '../components/InkWashBackground'
import '../styles/referencePolish.less'

const BASE = import.meta.env.BASE_URL

// Use the installed official vector library for day/night marks.
function SunWheelGlyph() { return <CompassOutline aria-hidden="true" /> }
function MoonCrescentGlyph() { return <StarOutline aria-hidden="true" /> }
// ════════════════════════════════════════════════════
//  传统时辰换算（TRD v3.0：动态算法换算十二时辰）
// ════════════════════════════════════════════════════
function getTraditionalTime() {
  const hours = new Date().getHours()
  const shichenList = [
    { name: '子时', range: '23:00-01:00', desc: '夜半人静，月照竹影' },
    { name: '丑时', range: '01:00-03:00', desc: '鸡鸣破晓，万籁俱寂' },
    { name: '寅时', range: '03:00-05:00', desc: '平旦晨曦，云蒸霞蔚' },
    { name: '卯时', range: '05:00-07:00', desc: '日出扶桑，晓雾轻拂' },
    { name: '辰时', range: '07:00-09:00', desc: '食时晨光，烟柳凝翠' },
    { name: '巳时', range: '09:00-11:00', desc: '隅中日照，琴韵悠扬' },
    { name: '午时', range: '11:00-13:00', desc: '日中当空，竹影婆娑' },
    { name: '未时', range: '13:00-15:00', desc: '日昳微风，烹茶品茗' },
    { name: '申时', range: '15:00-17:00', desc: '哺时斜照，书声朗朗' },
    { name: '酉时', range: '17:00-19:00', desc: '日入暮霞，烟波浩渺' },
    { name: '戌时', range: '19:00-21:00', desc: '黄昏掌灯，抚琴长啸' },
    { name: '亥时', range: '21:00-23:00', desc: '人定归心，掩卷幽思' },
  ]
  const idx = Math.floor(((hours + 1) % 24) / 2)
  return shichenList[idx]
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
  { seal: '酪', modern: '拍奶茶', ancient: '酪饮 / 酥签' },
  { seal: '笈', modern: '拍书包', ancient: '筒简 / 书笈' },
]

// 首屏预置的雅译范例（与后端离线典范库口径一致）
const YAYAN_PRESET = {
  ancient: '偷得浮生半日闲，竹杖芒鞋轻胜马。',
  author: '苏轼（化用风骨）',
  explanation: '清风怡情，信步幽林，极尽萧散之趣。',
}

// 漫游古今经典城邑库
const ANCIENT_CITIES = [
  { name: '杭州', ancient: '临安', temp: '24°', weather: '晴和', desc: '天朗气清，惠风和畅。', wuhou: '菊有黄华', text: '临安（杭州）· 水光潋滟晴方好' },
  { name: '开封', ancient: '汴京', temp: '19°', weather: '微风', desc: '烟柳画桥，风帘翠幕，参差十万人家。', wuhou: '草木黄落', text: '汴京（开封）· 烟柳画桥风帘幕' },
  { name: '西安', ancient: '长安', temp: '18°', weather: '清爽', desc: '春风得意马蹄疾，一日看尽长安花。', wuhou: '鸿雁来宾', text: '长安（西安）· 春风得意马蹄疾' },
  { name: '洛阳', ancient: '洛邑', temp: '20°', weather: '晴朗', desc: '洛阳地脉花最宜，牡丹尤为天下奇。', wuhou: '玄鸟归去', text: '洛阳（洛邑）· 地脉花宜满城香' },
  { name: '苏州', ancient: '姑苏', temp: '21°', weather: '薄雾', desc: '月落乌啼霜满天，江枫渔火对愁眠。', wuhou: '寒蝉鸣止', text: '姑苏（苏州）· 江枫渔火对愁眠' },
  { name: '南京', ancient: '金陵', temp: '23°', weather: '和煦', desc: '江南佳丽地，金陵帝王州。', wuhou: '水始涸', text: '金陵（南京）· 江南佳丽帝王州' },
]

export default function Home() {
  const navigate = useNavigate()
  const { toggleTheme, isDark } = useTheme()
  // 题头元素引用：水墨粒子引擎的手势监听直接挂在这里（不新增遮挡层）
  const heroRef = useRef(null)
  const heroInkZoneRef = useRef(null)

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
  const [currentCity, setCurrentCity] = useState(ANCIENT_CITIES[0])
  const [visibleCitySheet, setVisibleCitySheet] = useState(false)
  const curShichen = getTraditionalTime()
  const ganzhi = getGanzhi()
  const dateText = getDateText()

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
      Toast.show({ content: '已摘录入墨隐书斋 · 雅译锦囊', icon: 'success' })
    } catch {
      Toast.show({ content: '已收录' })
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
            className="home-hero__icon-btn home-hero__icon-btn--theme"
            onClick={toggleTheme}
            aria-label={isDark ? '当前月下墨境 · 点击切换为晓色晨宣' : '当前晓色晨宣 · 点击切换为月下墨境'}
            title={isDark ? '切换为晓色晨宣' : '切换为月下墨境'}
          >
            <span className="home-hero__glyph">
              {isDark ? <MoonCrescentGlyph /> : <SunWheelGlyph />}
            </span>
          </button>
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

      {/* ── 区块① 白话雅译（两端木轴卷轴 + 竖排红签）── */}
      <section className="home-card-scroll home-yayan-section">
        <ReferenceCorners />
        <div className="home-section-header">
          <h2 className="home-section-title">白话雅译</h2>
          <span className="home-section-seal">简</span>
        </div>

        <div className="home-yayan-scroll">
          <div className="home-yayan-inner">
            <div className="home-yayan-input-box">
              <span className="home-yayan-pencil" aria-hidden="true">
                <EditSOutline />
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
              <DownCircleOutline className="home-yayan-divider__arrow" />
            </div>

            {yayanResult && (
              <div className="home-yayan-result-card">
                <p className="home-yayan-ancient-text">
                  {yayanResult.ancient}
                  <i className="home-yayan-seal">闲</i>
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
          <h2 className="home-section-title">古今时令与天象</h2>
          <span className="home-section-seal">时</span>
          <button
            type="button"
            className="home-almanac__roam"
            onClick={() => setVisibleCitySheet(true)}
            aria-label="漫游古今城邑"
          >
            <CompassOutline className="home-almanac__roam-icon" />
            漫游
          </button>
        </div>
        <p className="home-section-sub">观天时，知物候，品古今生活之美。</p>

        <div className="home-almanac__cols">
          <div className="home-almanac__col">
            <span className="home-almanac__label">现代 · 今日</span>
            <div className="home-almanac__weather">
              {/* 图标铁律：使用已安装官方库矢量纹样 */}
              <span className="home-almanac__sun" aria-hidden="true">
                <SunWheelGlyph />
              </span>
              <span className="home-almanac__temp">{currentCity.temp}</span>
            </div>
            <p
              className="home-almanac__city"
              onClick={() => setVisibleCitySheet(true)}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
            >
              {currentCity.ancient}（{currentCity.name}）
              <DownOutline className="home-almanac__caret" />
            </p>
            <p className="home-almanac__date">{dateText}</p>
          </div>

          <div className="home-almanac__col">
            <span className="home-almanac__label">古代 · 时令</span>
            <p className="home-almanac__shichen">
              {curShichen.name}
              <DownOutline className="home-almanac__caret" />
              <em className="home-almanac__shichen-suffix">· 日映</em>
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
          <h2 className="home-section-title">古今识物</h2>
          <span className="home-section-seal">物</span>
        </div>
        <p className="home-section-sub">拍一物，识古名，探寻器物背后的风雅渊源。</p>

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
                onClick={() => navigate('/recognition')}
              >
                {item.modern.includes('奶茶') ? <ShopbagOutline className='home-shiwu-demo__symbol' aria-hidden='true' /> : <FileOutline className='home-shiwu-demo__symbol' aria-hidden='true' />}
                <span className="home-shiwu-demo__modern">{item.modern}</span>
                <RightOutline className="home-shiwu-demo__arrow" />
                <span className="home-shiwu-demo__ancient">{item.ancient}</span>
                <RightOutline className="home-shiwu-demo__chevron" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 区块④ 古诗词赏析 ── */}
      <section className="home-card-scroll home-poem-card">
        <ReferenceCorners />
        <div className="home-section-header">
          <h2 className="home-section-title">古诗词赏析</h2>
          <span className="home-section-seal">词</span>
        </div>
        <p className="home-section-sub">品读千古名篇，感受诗词中的人生境界。</p>

        <div className="home-poem-body">
          <p className="home-poem-title">《定风波·莫听穿林打叶声》</p>
          <p className="home-poem-meta">宋代 · 苏轼</p>
          <div className="home-poem-verses">
            <p>一蓑烟雨任平生，</p>
            <p>也无风雨也无晴。</p>
          </div>          <button
            type="button"
            className="home-poem-more"
            aria-label="展卷细读"
            onClick={() => navigate('/poem')}
          >
            <RightOutline />
          </button>
        </div>
      </section>

      {/* ── 漫游古今城邑抽屉 ── */}
      <ActionSheet
        visible={visibleCitySheet}
        actions={ANCIENT_CITIES.map((c) => ({
          text: c.text,
          key: c.ancient,
          description: `物候：${c.wuhou} · 气温 ${c.temp}`
        }))}
        onClose={() => setVisibleCitySheet(false)}
        onAction={(action) => {
          const matched = ANCIENT_CITIES.find((c) => c.ancient === action.key)
          if (matched) {
            setCurrentCity(matched)
            Toast.show({ content: `已漫游至${matched.ancient}：${matched.desc}` })
          }
          setVisibleCitySheet(false)
        }}
        cancelText="留驻当下"
      />
    </div>
  )
}
