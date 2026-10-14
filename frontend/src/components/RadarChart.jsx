import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createSpring, radarGeometry } from '../utils/radarGeometry.js'

/**
 * 纯数学极坐标 SVG 五维雷达图
 *
 * 特性：
 *  · 零硬编码：网格环 / 轴线 / 顶点 / 标签锚点全部由极坐标三角函数算出
 *  · 弹性形变：切换诗词时每个维度是一根**欠阻尼弹簧**（会过冲再回稳），
 *    而非线性 tween —— 这就是"平滑弹性形变动画"
 *  · 首次挂载从圆心"生长"出来（初值设为 0 + 给一点初速度）
 *  · 支持 prefers-reduced-motion：直接跳到目标值，不做动画
 *  · 纯 SVG，无 canvas、无第三方图表库
 */
export default function RadarChart({
  dimensions = [],
  size = 236,
  levels = 4,
  activeKey = null,
  onHoverDimension = null,
  caption = '',
}) {
  const scores = useMemo(() => dimensions.map((d) => Number(d.score) || 0), [dimensions])
  const labels = useMemo(() => dimensions.map((d) => d.label), [dimensions])
  const keys = useMemo(() => dimensions.map((d) => d.key), [dimensions])

  // 弹簧：每维一根（初始 0 → 首帧生长）
  const springsRef = useRef([])
  if (springsRef.current.length !== scores.length) {
    springsRef.current = scores.map(() => createSpring(0, { stiffness: 130, damping: 15 }))
  }

  const [display, setDisplay] = useState(() => scores.map(() => 0))
  const rafRef = useRef(null)
  const reducedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      reducedRef.current = mq.matches
    }
    sync()
    mq.addEventListener?.('change', sync)
    return () => mq.removeEventListener?.('change', sync)
  }, [])

  useEffect(() => {
    // 减弱动态效果：直接落位，不跑弹簧
    if (reducedRef.current) {
      springsRef.current.forEach((s, i) => s.reset(scores[i] ?? 0))
      setDisplay(scores.map((v) => v ?? 0))
      return undefined
    }

    // 维度数量变化时重建弹簧（避免索引错位）
    if (springsRef.current.length !== scores.length) {
      springsRef.current = scores.map((s, i) => createSpring(display[i] ?? 0, { stiffness: 130, damping: 15 }))
    }

    let last = 0
    let alive = true
    const tick = (now) => {
      if (!alive) return
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
      last = now
      let moving = false
      const next = springsRef.current.map((s, i) => {
        const target = scores[i] ?? 0
        if (!s.settled(target, 0.08)) moving = true
        return s.step(target, dt)
      })
      setDisplay(next)
      if (moving) rafRef.current = requestAnimationFrame(tick)
      else rafRef.current = null
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      alive = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      last = 0
    }
    // 仅在目标分值变化时重启弹簧循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores.join(',')])

  const geo = useMemo(() => radarGeometry(display, { size, levels, padding: 36 }), [display, size, levels])
  const targetGeo = useMemo(() => radarGeometry(scores, { size, levels, padding: 36 }), [scores, size, levels])

  if (!dimensions.length) return null

  return (
    <figure className="radar-chart">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="radar-chart__svg"
        role="img"
        aria-label={`五维雷达图：${dimensions.map((d) => `${d.label} ${d.score} 分`).join('，')}`}
      >
        <defs>
          <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--gf-cinnabar, #8A2B2B)" stopOpacity="0.34" />
            <stop offset="100%" stopColor="var(--gf-cinnabar, #8A2B2B)" stopOpacity="0.12" />
          </radialGradient>
          <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.6" floodColor="rgba(138,43,43,0.28)" />
          </filter>
        </defs>

        {/* 网格环（由极坐标算出） */}
        {geo.rings.map((pts, i) => (
          <polygon
            key={`ring-${i}`}
            points={pts}
            className={`radar-chart__ring${i === geo.rings.length - 1 ? ' is-outer' : ''}`}
          />
        ))}

        {/* 轴线 */}
        {geo.spokes.map((s, i) => (
          <line key={`spoke-${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} className="radar-chart__spoke" />
        ))}

        {/* 目标轮廓（虚影，便于看出"形变前后的差距"） */}
        <polygon points={targetGeo.pointString} className="radar-chart__ghost" />

        {/* 实测轮廓（弹性形变中） */}
        <polygon points={geo.pointString} className="radar-chart__shape" filter="url(#radarGlow)" />

        {/* 顶点 + 分值 */}
        {geo.points.map((p, i) => {
          const isActive = activeKey && keys[i] === activeKey
          return (
            <g key={`pt-${i}`} className={`radar-chart__node${isActive ? ' is-active' : ''}`}>
              <circle cx={p.x} cy={p.y} r={isActive ? 4.4 : 3.2} className="radar-chart__dot" />
              <text x={p.x} y={p.y - 7} textAnchor="middle" className="radar-chart__value">
                {Math.round(display[i])}
              </text>
            </g>
          )
        })}

        {/* 维度标签（锚点由角度决定，避免边缘出框） */}
        {geo.labelAnchors.map((a, i) => (
          <text
            key={`label-${i}`}
            x={a.x}
            y={a.y}
            textAnchor={a.anchor}
            dominantBaseline="middle"
            className={`radar-chart__label${activeKey && keys[i] === activeKey ? ' is-active' : ''}`}
            onPointerEnter={() => onHoverDimension && onHoverDimension(keys[i])}
            onPointerLeave={() => onHoverDimension && onHoverDimension(null)}
          >
            {labels[i]}
          </text>
        ))}
      </svg>
      {caption && <figcaption className="radar-chart__caption">{caption}</figcaption>}
    </figure>
  )
}
