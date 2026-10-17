import { useState, useEffect } from 'react'
import { playInkDropSound, triggerHaptic } from '../utils/guofengAudio'

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)
  const [isIos] = useState(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent)
    return isIosDevice && isSafari
  })
  const [showIosGuide, setShowIosGuide] = useState(false)

  useEffect(() => {
    // 检查是否已经在独立全屏/PWA模式运行
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')

    if (isStandalone) {
      return
    }

    // 检查用户近期是否主动关闭过提示（7天内免打扰）
    const dismissedTime = localStorage.getItem('sinowind_pwa_dismissed')
    if (dismissedTime && Date.now() - Number(dismissedTime) < 7 * 86400 * 1000) {
      return
    }

    // 监听 Chrome/Edge/Android 的安装提示事件
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // iOS 设备在浏览器中延迟 3 秒温和提示
    let timer = null
    if (isIos) {
      timer = setTimeout(() => {
        setVisible(true)
      }, 3000)
    }

    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [isIos])

  const handleInstallClick = async () => {
    playInkDropSound()
    triggerHaptic(20)

    if (deferredPrompt) {
      deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      if (choiceResult.outcome === 'accepted') {
        setVisible(false)
      }
      setDeferredPrompt(null)
    } else if (isIos) {
      setShowIosGuide(true)
    }
  }

  const handleDismiss = () => {
    triggerHaptic(10)
    setVisible(false)
    setShowIosGuide(false)
    localStorage.setItem('sinowind_pwa_dismissed', String(Date.now()))
  }

  if (!visible) return null

  return (
    <aside
      aria-label="添加至桌面体验"
      style={{
        position: 'fixed',
        bottom: '76px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '440px',
        zIndex: 998,
        backgroundColor: 'rgba(250, 247, 240, 0.96)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(138, 43, 43, 0.28)',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(44, 30, 22, 0.15)',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontFamily: "'STKaiti', 'KaiTi', serif",
        animation: 'fadeInUp 0.3s ease-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🏮</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2B2621', letterSpacing: '0.04em' }}>
              添至桌面 · 原生雅集沉浸
            </div>
            <div style={{ fontSize: '11px', color: '#7A6B5B' }}>
              去除浏览器地址栏，畅享移动端丝滑全屏
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={handleInstallClick}
            style={{
              backgroundColor: '#8A2B2B',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500,
              boxShadow: '0 2px 6px rgba(138, 43, 43, 0.3)'
            }}
          >
            添至桌面
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="稍后再说"
            style={{
              backgroundColor: 'transparent',
              color: '#9C8F80',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '2px 6px',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      </div>

      {showIosGuide && (
        <div
          style={{
            backgroundColor: '#F3EDE2',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '11px',
            color: '#5C4F43',
            lineHeight: 1.5,
            borderLeft: '3px solid #8A2B2B'
          }}
        >
          <strong>苹果 iOS 安装指南：</strong> 点击 Safari 底栏【分享 ⎋】按钮，向下滑动选择【添加到主屏幕 ⊞】即可生成独立应用图标。
        </div>
      )}
    </aside>
  )
}
