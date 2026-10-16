import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LeftOutline, SearchOutline } from 'antd-mobile-icons'
import InkWashBackground from '../components/InkWashBackground'
import ReferenceCorners from '../components/ReferenceCorners'
import { cityChronicle, NOT_FOUND_TIP, RECOMMEND_CITIES } from '../utils/cityChronicle.js'
import { CITIES } from '../utils/geoCities.js'
import '../styles/cityChronicle.less'
import '../styles/referencePolish.less'

/**
 * 《九州地名志 · 城邑春秋》二级页面
 *
 * 2026-10-16 由底部弹窗改为独立全屏页 —— 原弹窗高度受限，朝代沿革轴会被压缩在
 * 抽屉底部，阅读体验差。改为顶级路由（与 /poem、/recognition 同族，不套 Layout）。
 *
 * 数据流：本页不持有「当前城邑」状态（那属于 Home 的时令卡片）。用户点
 * 「留驻此时空 · 切换时令」时，把选中的城名写入 sessionStorage 并派发事件，
 * Home 监听后自行更新并重取真实气温，随后返回 /home。
 */
export default function CityChroniclePage() {
  const navigate = useNavigate()
  // 默认带入当前城邑（由 Home 通过 sessionStorage 传入，避免多存一份全局状态）
  const [query, setQuery] = useState(() => {
    try { return sessionStorage.getItem('city-chronicle:from') || '' } catch { return '' }
  })

  const chronicle = useMemo(() => cityChronicle(query), [query])
  const hits = useMemo(() => {
    const q = query.trim()
    if (!q || chronicle) return []
    return CITIES.filter((c) => c[0].includes(q) || (c[4] && c[4].includes(q))).slice(0, 12)
  }, [query, chronicle])

  /** 留驻此时空：交给 Home 去更新时令卡片（本页只负责传意） */
  const commit = (name) => {
    try { sessionStorage.setItem('city-chronicle:commit', String(name || '')) } catch { /* 无 storage 时忽略 */ }
    window.dispatchEvent(new CustomEvent('city-chronicle:commit', { detail: { name } }))
    navigate('/home')
  }

  const goBack = () => navigate('/home')

  return (
    <div className="city-chronicle-root reference-polish">
      <InkWashBackground />

      <header className="chronicle-header">
        <div className="chronicle-header__back" onClick={goBack} title="返回雅集">
          <LeftOutline />
        </div>
        <h1 className="chronicle-header__title">九州地名志</h1>
        <span className="chronicle-header__seal">城邑春秋</span>
      </header>
      <p className="chronicle-sub">展卷览一城之前世今生 · 读千年风雅 与君共此山河</p>

      <div className="chronicle-card">
        <ReferenceCorners />

        <label className="home-chronicle__search chronicle-search">
          <SearchOutline aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入今夕城邑（如：西安、南京、杭州、北京、洛阳、成都……）"
            autoComplete="off"
          />
        </label>

        <div className="chronicle-body">
          {!query.trim() && (
            <p className="home-chronicle__hint">
              输入一座城邑，展卷看它的前世今生 —— 今名、古称、省名与简称皆可（如「长安」「金陵」「四川」「粤」）
            </p>
          )}

          {query.trim() && chronicle && (
            <>
              <p className="home-chronicle__title">
                {chronicle.key}
                <em className="home-chronicle__title-sub">
                  历代沿革
                  {chronicle.via === 'province' ? `（由「${chronicle.province}」展开省会）` : ''}
                </em>
              </p>
              <ol className="home-chronicle__axis">
                {chronicle.timeline.map(([era, place, note], i) => (
                  <li key={`${era}-${place}-${i}`} className="home-chronicle__node">
                    <span className="home-chronicle__era">{era}</span>
                    <span className="home-chronicle__place">〔{place}〕</span>
                    <span className="home-chronicle__note">—— {note}</span>
                  </li>
                ))}
              </ol>
            </>
          )}

          {query.trim() && !chronicle && (
            <div className="home-chronicle__void">
              <p className="home-chronicle__void-tip">「{NOT_FOUND_TIP}」</p>
              {hits.length > 0 && (
                <>
                  <p className="home-chronicle__void-sub">九州之内，可否是此邑：</p>
                  <div className="home-chronicle__reco">
                    {hits.map((c) => (
                      <button key={c[0]} type="button" onClick={() => setQuery(c[0])}>
                        {c[4] ? `${c[4]}（${c[0]}）` : c[0]}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className="home-chronicle__void-sub">亦且先探江南名邑：</p>
              <div className="home-chronicle__reco">
                {RECOMMEND_CITIES.map((c) => (
                  <button key={c} type="button" onClick={() => setQuery(c)}>{c}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="home-chronicle__commit chronicle-commit"
          disabled={!chronicle}
          onClick={() => commit(chronicle ? chronicle.key : '')}
        >
          留驻此时空 · 切换时令
        </button>
      </div>
    </div>
  )
}
