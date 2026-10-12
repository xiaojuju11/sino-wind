import React, { useState, useEffect } from 'react'
import '../styles/home.less'
import { Toast } from 'antd-mobile'
import { DownOutline, RightOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import axios from '../http'

const BASE = import.meta.env.BASE_URL
const asset = (name) => `${BASE}assets/home/${name}`

// 计算当前传统时辰与物候
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

// 示例白话灵感推荐词
const YAYAN_PRESETS = [
  '今天下班好累，想去吃火锅喝奶茶',
  '春日微风不燥，想与好友踏青西湖',
  '人生得一知己足矣，今夜当痛饮',
  '工作虽忙，但心中依然有诗和远方'
]

// 现代器物与古代器物对照清单
const ANCIENT_ARTIFACT_COMPARISONS = [
  { icon: '🧋', modern: '奶茶', ancient: '酪饮 / 酥签', desc: '宋代夜市冷饮酥签，以乳酪加蜜香果制成，宋人暑日必啜' },
  { icon: '🎒', modern: '双肩包', ancient: '箧笥 / 笈', desc: '古人负笈游学，竹篾藤条编箧，收罗笔墨经籍' },
  { icon: '☂️', modern: '折叠伞', ancient: '油纸伞 / 盖', desc: '竹骨青桐，皮纸刷桐油，遮烟雨而留水墨清韵' },
  { icon: '💡', modern: '现代台灯', ancient: '铜雁鱼灯', desc: '西汉青铜长明灯，雁腹盛水内收油烟，古今同重光华' }
]

export default function Home() {
  const navigate = useNavigate()
  const { theme, toggleTheme, isDark } = useTheme()

  // 1. 白话雅译状态
  const [inputText, setInputText] = useState('')
  const [translating, setTranslating] = useState(false)
  const [yayanResult, setYayanResult] = useState({
    ancient: '日暮倦归，思炙肉暖釜，兼啜酪饮以慰幽怀。',
    author: '苏轼（化用风骨）',
    explanation: '两宋市井食饮小记之闲适温婉，以温热锅釜慰藉疲惫心神。'
  })

  // 2. 时辰与物候
  const curShichen = getTraditionalTime()

  // 白话雅译请求
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

  // 摘录入卷（收藏到本地雅言锦囊）
  const handleCollectYayan = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('gufeng_yayan_list') || '[]')
      saved.unshift({
        id: Date.now(),
        ...yayanResult,
        createdAt: new Date().toLocaleDateString()
      })
      localStorage.setItem('gufeng_yayan_list', JSON.stringify(saved))
      Toast.show({ content: '已摘录入墨隐书斋 · 雅译锦囊', icon: 'success' })
    } catch {
      Toast.show({ content: '已收录' })
    }
  }

  return (
    <div className="home-root" style={{ backgroundImage: `url(${asset('bg-paper.jpg')})` }}>
      {/* 1. 顶部题头与晓色晨宣/月下墨境切换 */}
      <header className="home-hero">
        <div className="home-hero__top-bar">
          <div className="home-hero__title-row">
            <h1 className="home-hero__title">华风雅集</h1>
            <span className="home-hero__seal">两宋</span>
          </div>
          <button
            type="button"
            className="home-theme-btn"
            onClick={toggleTheme}
            aria-label="切换日月墨境"
          >
            <span className="home-theme-btn__icon">{isDark ? '🌙' : '☀️'}</span>
            <span className="home-theme-btn__text">{isDark ? '月下墨境' : '晓色晨宣'}</span>
          </button>
        </div>
        <p className="home-hero__sub">SinoWind · 读千年风雅 与君共此山河</p>
      </header>

      {/* 2. 【核心亮点】白话雅译 · 古意今传 卷轴卡片 */}
      <section className="home-card-scroll home-yayan-section">
        <div className="home-section-header">
          <div className="home-section-header__title-wrap">
            <span className="home-section-tag">白话雅译</span>
            <h2 className="home-section-title">古意今传 · 挥毫化雅言</h2>
          </div>
          <span className="home-section-seal">诗笔</span>
        </div>
        <p className="home-yayan-sub">输入今人白话，AI 即刻化为两宋雅言与魏晋风骨</p>

        {/* 输入框 */}
        <div className="home-yayan-input-box">
          <textarea
            className="home-yayan-textarea"
            rows={2}
            placeholder="输入今日白话，如：下班好累想吃火锅喝奶茶……"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <div className="home-yayan-actions">
            <button
              type="button"
              className="home-yayan-submit-btn"
              disabled={translating}
              onClick={() => handleTranslate()}
            >
              {translating ? '先贤研墨中…' : '转译雅言'}
            </button>
          </div>
        </div>

        {/* 灵感胶囊推荐 */}
        <div className="home-yayan-presets">
          <span className="home-yayan-presets-label">灵感拾遗：</span>
          <div className="home-yayan-chips">
            {YAYAN_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                className="home-yayan-chip"
                onClick={() => {
                  setInputText(preset)
                  handleTranslate(preset)
                }}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* 雅译呈现结果卷轴 */}
        {yayanResult && (
          <div className="home-yayan-result-card">
            <div className="home-yayan-ancient-text">
              <span className="home-yayan-quotes">“</span>
              {yayanResult.ancient}
              <span className="home-yayan-quotes">”</span>
            </div>
            <div className="home-yayan-meta">
              <span className="home-yayan-author">—— {yayanResult.author}</span>
              <p className="home-yayan-explain">{yayanResult.explanation}</p>
            </div>
            <div className="home-yayan-bottom-btns">
              <button
                type="button"
                className="home-yayan-collect-btn"
                onClick={handleCollectYayan}
              >
                摘录入卷
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. 岁时节气与干支天象 */}
      <section className="home-almanac">
        <div className="home-almanac__col home-almanac__col--weather">
          <p className="home-almanac__city">
            杭城 · {curShichen.name}
            <DownOutline className="home-almanac__caret" />
          </p>
          <div className="home-almanac__weather">
            <svg className="home-almanac__icon" viewBox="0 0 32 32" aria-hidden="true">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
              <path d="M20 24c3.3 0 6-2.2 6-5s-2.7-5-6-5c-1.4 0-2.7.4-3.7 1.2" />
            </svg>
            <span className="home-almanac__temp">24°</span>
          </div>
          <p className="home-almanac__desc">秋高气爽 · {curShichen.desc}</p>
        </div>

        <div className="home-almanac__col home-almanac__col--lunar">
          <p className="home-almanac__lunar">{curShichen.range}</p>
          <p className="home-almanac__ganzhi">白露三候 · 菊有黄华</p>
        </div>

        <div className="home-almanac__col home-almanac__col--term">
          <p className="home-almanac__term">
            清明
            <i className="home-almanac__seal">华风</i>
          </p>
          <p className="home-almanac__term-desc">
            <span>露从今夜白</span>
            <span>月是故乡明</span>
          </p>
        </div>
      </section>

      {/* 4. 【物溯古今 · 拍照识器】快捷入口 */}
      <section className="home-card-scroll home-shiwu-section">
        <div className="home-section-header">
          <div className="home-section-header__title-wrap">
            <span className="home-section-tag home-section-tag--bamboo">今物寻古</span>
            <h2 className="home-section-title">物溯古今 · 拍照识器</h2>
          </div>
          <button
            type="button"
            className="home-shiwu-action-link"
            onClick={() => navigate('/recognition')}
          >
            立即识物 <RightOutline />
          </button>
        </div>
        <p className="home-shiwu-sub">摄取今人日常器用，AI 推演古物原型与千年流变</p>

        {/* 现代器物与古器对照微卡片 */}
        <div className="home-shiwu-grid">
          {ANCIENT_ARTIFACT_COMPARISONS.map((item, idx) => (
            <div
              key={idx}
              className="home-shiwu-item"
              onClick={() => navigate('/recognition')}
            >
              <div className="home-shiwu-item__icon">{item.icon}</div>
              <div className="home-shiwu-item__content">
                <div className="home-shiwu-item__names">
                  <span className="home-shiwu-item__modern">{item.modern}</span>
                  <span className="home-shiwu-item__arrow">➔</span>
                  <span className="home-shiwu-item__ancient">{item.ancient}</span>
                </div>
                <p className="home-shiwu-item__desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. 【古诗词赏析推荐】推荐展卷卡片 */}
      <section className="home-card-scroll home-poem-card">
        <div className="home-section-header">
          <div className="home-section-header__title-wrap">
            <span className="home-section-tag">飞花诗令</span>
            <h2 className="home-section-title">今日一诗 · 饮湖上初晴后雨</h2>
          </div>
          <button
            type="button"
            className="home-shiwu-action-link"
            onClick={() => navigate('/poem')}
          >
            品韵大卷轴 <RightOutline />
          </button>
        </div>
        <div className="home-poem-body">
          <div className="home-poem-verses">
            <p>水光潋滟晴方好，山色空濛雨亦奇。</p>
            <p>欲把西湖比西子，淡妆浓抹总相宜。</p>
          </div>
          <div className="home-poem-author-row">
            <span className="home-poem-author">【宋】苏轼 · 杭州西湖</span>
            <span className="home-poem-seal">苏子</span>
          </div>
        </div>
      </section>
    </div>
  )
}
