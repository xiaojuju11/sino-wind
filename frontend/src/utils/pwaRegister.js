// ══════════════════════════════════════════════════════════════
//  云山竹简 · 华风雅集 —— PWA Service Worker 注册调度器
// ══════════════════════════════════════════════════════════════

export function registerServiceWorker() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // 在生产环境或支持的环境注册 serviceWorker
      const swUrl = `${import.meta.env.BASE_URL || '/'}sw.js`
      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => {
          if (reg && reg.onupdatefound) {
            reg.onupdatefound = () => {
              const installingWorker = reg.installing
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] 雅集系统已更新就绪')
                  }
                }
              }
            }
          }
        })
        .catch((err) => {
          console.warn('[PWA] ServiceWorker 注册提示（弱网或开发模式跳过）:', err?.message || err)
        })
    })
  }
}
