import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

/**
 * 宣纸水墨/朱砂晕染组件 (InkSpreadZone)
 *
 * 核心特性：
 * 1. 模拟生宣纸吸水墨法：墨分五色（焦、浓、重、淡、清）
 * 2. 支持水墨色（black）与朱砂印泥色（cinnabar）
 * 3. 边缘伴随飞白与微型渗墨毛须（通过贝塞尔扰动与微墨滴模拟）
 * 4. pointer-events: none，绝不阻挡任何按钮、文字选中的交互
 * 5. 支持挂载到特定 DOM 容器，也支持 ref 暴露手动触发 triggerBleed(x, y, colorType)
 */
const InkSpreadZone = forwardRef(function InkSpreadZone(
  {
    targetRef, // 监听交互的目标容器，若不传则监听父容器
    color = 'ink', // 'ink' (水墨) | 'cinnabar' (朱砂) | 'auto'
    className = '',
    style = {},
  },
  ref
) {
  const canvasRef = useRef(null)
  const dropsRef = useRef([])
  const animIdRef = useRef(null)

  // 墨水扩散粒子实体
  function addInkBlot(cx, cy, blotColor, intensity = 1) {
    const isCinnabar = blotColor === 'cinnabar' || blotColor === 'seal'

    // 核心墨团（中心浓墨，外层淡墨）
    const mainDrop = {
      cx,
      cy,
      radius: 4 * intensity,
      maxRadius: (28 + Math.random() * 22) * intensity,
      alpha: 0.72,
      decay: 0.945, // 宣纸阻尼吸水系数
      speed: (1.4 + Math.random() * 0.8) * intensity,
      isCinnabar,
      filaments: [], // 宣纸毛细管渗墨毛须
    }

    // 随机生成 4~8 条向四周微渗的宣纸毛细管纤维须
    const filamentCount = Math.floor(5 + Math.random() * 4)
    for (let i = 0; i < filamentCount; i++) {
      const angle = (Math.PI * 2 * i) / filamentCount + (Math.random() - 0.5) * 0.5
      const length = (mainDrop.maxRadius * (0.8 + Math.random() * 0.5))
      mainDrop.filaments.push({
        angle,
        length,
        curLen: 3,
        speed: (0.8 + Math.random() * 0.6) * intensity,
        width: 1.2 + Math.random() * 1.5,
      })
    }

    dropsRef.current.push(mainDrop)

    // 随行微墨星（飞白飞溅）
    const splashCount = Math.floor(3 + Math.random() * 4)
    for (let i = 0; i < splashCount; i++) {
      const dist = (12 + Math.random() * 30) * intensity
      const angle = Math.random() * Math.PI * 2
      dropsRef.current.push({
        cx: cx + Math.cos(angle) * dist,
        cy: cy + Math.sin(angle) * dist,
        radius: 1 + Math.random() * 2,
        maxRadius: (4 + Math.random() * 6) * intensity,
        alpha: 0.45,
        decay: 0.92,
        speed: 0.4 + Math.random() * 0.4,
        isCinnabar,
        filaments: [],
      })
    }
  }

  // 暴露给父组件的主动触发方法（例如点击印章时在指定位置炸开朱砂印泥）
  useImperativeHandle(ref, () => ({
    triggerBleed: (x, y, customColor = color, intensity = 1) => {
      addInkBlot(x, y, customColor, intensity)
    },
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const container = targetRef?.current || canvas.parentElement
    if (!container) return

    const ctx = canvas.getContext('2d')

    // 画布自适应父容器尺寸
    const resize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    // 监听目标区域的手势/点击
    const handlePointerDown = (e) => {
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      addInkBlot(x, y, color)
    }

    container.addEventListener('pointerdown', handlePointerDown)

    // 渲染循环
    const render = () => {
      const rect = container.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      const drops = dropsRef.current
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]

        // 绘制主墨团（生宣纸径向墨阶）
        ctx.save()
        const grad = ctx.createRadialGradient(d.cx, d.cy, 0, d.cx, d.cy, d.radius)

        if (d.isCinnabar) {
          // 朱砂印泥阶：中心饱满朱红 -> 外沿温润印泥红 -> 边缘淡化
          grad.addColorStop(0, `rgba(138, 43, 43, ${d.alpha * 0.9})`)
          grad.addColorStop(0.45, `rgba(168, 56, 56, ${d.alpha * 0.6})`)
          grad.addColorStop(0.85, `rgba(196, 85, 75, ${d.alpha * 0.2})`)
          grad.addColorStop(1, 'rgba(138, 43, 43, 0)')
        } else {
          // 水墨五色阶：焦墨中心 -> 浓墨 -> 湿墨 -> 清水淡边
          grad.addColorStop(0, `rgba(32, 32, 32, ${d.alpha * 0.85})`)
          grad.addColorStop(0.35, `rgba(48, 48, 48, ${d.alpha * 0.55})`)
          grad.addColorStop(0.75, `rgba(90, 88, 80, ${d.alpha * 0.22})`)
          grad.addColorStop(1, 'rgba(43, 43, 43, 0)')
        }

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(d.cx, d.cy, d.radius, 0, Math.PI * 2)
        ctx.fill()

        // 绘制宣纸纤维毛边渗透线（极具中国画生宣渗化特色）
        if (d.filaments && d.filaments.length > 0) {
          ctx.strokeStyle = d.isCinnabar
            ? `rgba(138, 43, 43, ${d.alpha * 0.4})`
            : `rgba(43, 43, 43, ${d.alpha * 0.35})`
          ctx.lineCap = 'round'

          for (const f of d.filaments) {
            ctx.lineWidth = f.width * (d.alpha / 0.72)
            ctx.beginPath()
            ctx.moveTo(d.cx, d.cy)
            const targetX = d.cx + Math.cos(f.angle) * f.curLen
            const targetY = d.cy + Math.sin(f.angle) * f.curLen
            ctx.lineTo(targetX, targetY)
            ctx.stroke()

            if (f.curLen < f.length) {
              f.curLen += f.speed
            }
          }
        }

        ctx.restore()

        // 物理演进
        if (d.radius < d.maxRadius) {
          d.radius += d.speed
          d.speed *= 0.94 // 宣纸扩散阻尼
        }
        d.alpha *= d.decay // 墨汁渗入纸张纤维

        // 墨尽淡出销毁
        if (d.alpha < 0.015) {
          drops.splice(i, 1)
        }
      }

      animIdRef.current = requestAnimationFrame(render)
    }

    animIdRef.current = requestAnimationFrame(render)

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown)
      ro.disconnect()
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current)
    }
  }, [color, targetRef])

  return (
    <canvas
      ref={canvasRef}
      className={`ink-spread-zone-canvas ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
        ...style,
      }}
      aria-hidden="true"
    />
  )
})

export default InkSpreadZone
