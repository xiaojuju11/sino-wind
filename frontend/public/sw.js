// ══════════════════════════════════════════════════════════════
//  云山竹简 · 华风雅集 —— 移动端 PWA 离线高可用 Service Worker
//  作用：全屏原生应用体验、静态资源极速离线缓存、现场答辩弱网容灾
// ══════════════════════════════════════════════════════════════

const CACHE_NAME = 'sinowind-cmit-v1.0.0'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg'
]

// 1. 安装阶段：预缓存核心壳文件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[PWA SW] Pre-caching static assets skipped or partial:', err)
      })
    }).then(() => self.skipWaiting())
  )
})

// 2. 激活阶段：清理旧版本缓存并立即接管
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// 3. 拦截请求：优先策略（静态资源 Stale-While-Revalidate，页面导航 Fallback）
self.addEventListener('fetch', (event) => {
  const req = event.request

  // 仅拦截 GET 请求
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // API 接口请求与热更新直接走网络
  if (url.pathname.startsWith('/api') || url.pathname.includes('/@vite/') || url.pathname.includes('/@react-refresh')) {
    return
  }

  // 单页应用导航：Network first, fallback to cached index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match('/index.html') || caches.match('/')
      })
    )
    return
  }

  // 本地同源静态文件（JS, CSS, 图片, SVG, 字体）：Stale-While-Revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        const fetchPromise = fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseToCache)
            })
          }
          return networkResponse
        }).catch(() => {
          // 网络断开直接使用缓存
          return cachedResponse
        })

        return cachedResponse || fetchPromise
      })
    )
  }
})
