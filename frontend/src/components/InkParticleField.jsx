import React, { useEffect, useMemo, useRef, useState } from 'react'
import { InkEngine } from '../utils/inkEngine/InkEngine.js'
import { atmosphere } from '../utils/inkEngine/solarTerms.js'
import { useTheme } from '../context/useTheme'
import '../styles/inkEngine.less'

/**
 * 首页水墨流体粒子引擎（Canvas 2D · 60fps）
 *
 * 分层（关键设计：绝不新增遮挡层）：
 *   .ink-engine            固定全屏装饰层，pointer-events:none（装饰画布永不拦点击）
 *     canvas               粒子绘制（落叶 / 流萤 / 雨丝 / 飞雪 + 涟漪 + 墨霭）
 *     .ink-engine__hint    首访提示（无交互）
 *     .ink-engine__hud     节气读数 + 形态切换（仅按钮自身可点）
 *
 * 交互接入方式：**不铺任何覆盖层**，而是把 pointer 监听直接挂到
 * 「题头元素」上（由 Home 传入 interactionTarget）。这样：
 *   · 日月切换 / 设置等按钮照常可点（事件冒泡到题头，互不冲突）
 *   · 手指划动题头即触发水墨扩散与粒子躲避
 *
 * 性能与无障碍：
 *   · prefers-reduced-motion 时不启动（只留静态节气读数）
 *   · 页面切到后台自动暂停（document.hidden）
 *   · 帧率不足自动降配（引擎内 autoTune）
 *   · 组件卸载彻底 destroy，杜绝 rAF 泄漏
 */
const MODES = [
  { key: 'auto', label: '随风' },
  { key: 'leaf', label: '落叶' },
  { key: 'firefly', label: '流萤' },
  { key: 'rain', label: '烟雨' },
  { key: 'snow', label: '飞雪' },
]

export default function InkParticleField({ interactionTarget }) {
  const { isDark } = useTheme()
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const [mode, setMode] = useState('auto')
  const [showHud, setShowHud] = useState(true)
  const [reduced, setReduced] = useState(false)
  const [ready, setReady] = useState(false)

  // 节气氛围：随真实日期变化（黄经算法，非硬编码）
  const atm = useMemo(() => atmosphere(new Date()), [])

  // ── 无障碍：尊重系统「减弱动态效果」──
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener?.('change', sync)
    return () => mq.removeEventListener?.('change', sync)
  }, [])

  // ── 引擎启动 / 尺寸自适应 / 后台暂停 ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || reduced) return

    const engine = new InkEngine(canvas, { interactive: true })
    engineRef.current = engine
    engine.setAtmosphere(new Date(), isDark, mode)
    engine.start()
    setReady(true)

    let resizeTimer = null
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => engine.resize(), 160)
    }
    const onActivity = () => {
      const focused = document.activeElement?.matches?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])') ?? false
      const blocked = document.hidden || focused
      canvas.closest('.ink-engine')?.classList.toggle('is-input-paused', blocked)
      if (blocked) engine.pause(); else engine.resume()
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    document.addEventListener('visibilitychange', onActivity)
    document.addEventListener('focusin', onActivity)
    document.addEventListener('focusout', onActivity)
    onActivity()

    return () => {
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      document.removeEventListener('visibilitychange', onActivity)
      document.removeEventListener('focusin', onActivity)
      document.removeEventListener('focusout', onActivity)
      engine.destroy()
      engineRef.current = null
    }
    // 主题/模式变化不重建引擎，只切氛围（见下一个 effect）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  // ── 主题 / 粒子模式切换：不重建，只换配置 ──
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.setAtmosphere(new Date(), isDark, mode)
  }, [isDark, mode])

  // ── 手势交互：监听挂在题头元素上（无覆盖层）──
  useEffect(() => {
    const target = interactionTarget?.current
    if (!target || reduced) return undefined

    const toLocal = (e) => {
      const rect = canvasRef.current.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const onDown = (e) => {
      const engine = engineRef.current
      if (!engine) return
      const { x, y } = toLocal(e)
      engine.pointerDown(x, y)
    }
    const onMove = (e) => {
      const engine = engineRef.current
      if (!engine?.pointer.active) return
      const { x, y } = toLocal(e)
      engine.pointerMove(x, y)
    }
    const onEnd = () => engineRef.current?.pointerUp()

    target.addEventListener('pointerdown', onDown)
    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onEnd)
    target.addEventListener('pointercancel', onEnd)
    target.addEventListener('pointerleave', onEnd)
    return () => {
      target.removeEventListener('pointerdown', onDown)
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onEnd)
      target.removeEventListener('pointercancel', onEnd)
      target.removeEventListener('pointerleave', onEnd)
      onEnd()
    }
  }, [interactionTarget, reduced])

  // 供验收脚本读取引擎指标
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    window.__INK_ENGINE_METRICS__ = () => engineRef.current?.metrics() || null
    return () => {
      delete window.__INK_ENGINE_METRICS__
    }
  }, [])

  // 减弱动态效果：给一个静态的节气氛围说明，不跑动画
  if (reduced) {
    return (
      <div className="ink-engine is-reduced" aria-hidden="true">
        <div className="ink-engine__hud ink-engine__hud--static">
          <span className="ink-engine__term">{atm.term}</span>
          <span className="ink-engine__motif">{atm.motif}</span>
          <span className="ink-engine__hint">已按系统偏好停用水墨动效</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`ink-engine${ready ? ' is-ready' : ''}`} aria-hidden="true">
      <canvas ref={canvasRef} className="ink-engine__canvas" />

      {showHud && (
        <div className="ink-engine__hud">
          <span className="ink-engine__term" title={`太阳视黄经 ${atm.longitude.toFixed(2)}°`}>
            {atm.term}
          </span>
          <span className="ink-engine__motif">{atm.motif}</span>
          <div className="ink-engine__modes" role="group" aria-label="水墨粒子形态">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`ink-engine__mode${mode === m.key ? ' is-active' : ''}`}
                onClick={() => setMode(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ink-engine__close"
            onClick={() => setShowHud(false)}
            aria-label="隐藏节气读数"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
