import React, { useState } from 'react'
import '../styles/home.less'
import { Toast } from 'antd-mobile'
import { DownOutline, RightOutline, CompassOutline, EditSOutline, CheckCircleOutline, DownCircleOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import axios from '../http'

const BASE = import.meta.env.BASE_URL
const asset = (name) => `${BASE}assets/home/${name}`

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
const SHIWU_DEMOS = [
  { icon: '☕', modern: '拍奶茶', ancient: '酪饮 / 酥签' },
  { icon: '🎒', modern: '拍书包', ancient: '筒简 / 书笈' },
]

export default function Home() {
  const navigate = useNavigate()
  const { toggleTheme, isDark } = useTheme()

  // ① 白话雅译
  const [inputText, setInputText] = useState('')
  const [translating, setTranslating] = useState(false)
  const [yayanResult, setYayanResult] = useState({
    ancient: '偷得浮生半日闲，竹杖芒鞋轻胜马。',
    author: '苏轼（化用风骨）',
    explanation: '清风怡情，信步幽林，极尽萧散之趣。',
  })

  // ② 时令天象（动态换算）
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
      if (res?.data?.data) {
        setYayanResult(res.data.data)
      }
    } catch (err) {
      Toast.show({ content: '墨迹暂凝，已呈清雅之辞' })
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
        ...yayanResult,
        createdAt: new Date().toLocaleDateString(),
      })
      localStorage.setItem('gufeng_yayan_list', JSON.stringify(saved))
      Toast.show({ content: '已摘录入墨隐书斋 · 雅译锦囊', icon: 'success' })
    } catch {
      Toast.show({ content: '已收录' })
    }
  }

  return (
    <div className="home-root" style={{ backgroundImage: `url(${asset('bg-paper.jpg')})` }}>
      {/* ── 题头：云山竹简 + 朱砂印「华风」+ 副标 + 右上角日月/设置 ── */}
      <header className="home-hero">
        <div className="home-hero__actions">
          <button
            type="button"
            className="home-hero__icon-btn home-hero__icon-btn--theme"
            onClick={toggleTheme}
            aria-label={isDark ? '切换为晓色晨宣' : '切换为月下墨境'}
          >
            <span className="home-hero__icon-emoji">{isDark ? '🌙' : '☀️'}</span>
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
          <span className="home-hero__seal">华风</span>
        </div>
        <p className="home-hero__sub">—— 读千年风雅 与君共此山河 ——</p>
      </header>

      {/* ── 区块① 白话雅译（两端木轴卷轴 + 竖排红签）── */}
      <section className="home-card-scroll home-yayan-section">
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
                rows={2}
                maxLength={100}
                placeholder="输入你的日常大白话（如：今天心情真好）…"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <span className="home-yayan-counter">{inputText.length}/100</span>
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
        <div className="home-section-header">
          <h2 className="home-section-title">古今时令与天象</h2>
          <span className="home-section-seal">时</span>
          <button
            type="button"
            className="home-almanac__roam"
            onClick={() => Toast.show({ content: '漫游古今：换城易时，静候雅聚' })}
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
              <span className="home-almanac__sun" aria-hidden="true">☀️</span>
              <span className="home-almanac__temp">24°</span>
            </div>
            <p className="home-almanac__city">
              杭州
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
            <p className="home-almanac__desc">天朗气清，惠风和畅。</p>
            <p className="home-almanac__wuhou">🌼 物候：菊有黄华</p>
          </div>
        </div>
      </section>

      {/* ── 区块③ 古今识物 ── */}
      <section className="home-card-scroll home-shiwu-section">
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
              ↗ 示例体验（点击试试）
            </p>
            {SHIWU_DEMOS.map((item) => (
              <button
                key={item.modern}
                type="button"
                className="home-shiwu-demo__item"
                onClick={() => navigate('/recognition')}
              >
                <span className="home-shiwu-demo__icon" aria-hidden="true">{item.icon}</span>
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
    </div>
  )
}
