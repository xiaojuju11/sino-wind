import { useEffect } from 'react'
import '../styles/layout.less'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useKeyboardOpen } from '../utils/useKeyboardOpen'
import { clearSessionToken, isSessionFresh, readToken } from '../utils/session'

// 🏮 公共底部导航（三栏：雅集 / 知音 / 书斋）
// 全量遵循项目图标铁律：使用用户定制 Iconfont 字体图标，纯矢量渲染，零位图死图片
const tabs = [
  { id: 'home', path: '/home', name: '雅集', iconClass: 'icon-jingqu' },
  { id: 'letters', path: '/letters', name: '知音', iconClass: 'icon-message' },
  { id: 'mine', path: '/mine', name: '书斋', iconClass: 'icon-ziliao' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const token = readToken()
  // 过期的 token 不再当作登录态，直接回登录页（并清掉，免得首个请求再被 416）
  const authed = isSessionFresh(token)
  const activeTab = tabs.find((tab) => pathname.startsWith(tab.path))?.id || 'home'
  // ⌨️ 软键盘弹起时收起底部 Tab：Android/微信会把 layout viewport 压到键盘上方，
  // 固定底栏随之被顶起并遮住正文；iOS 则整条被键盘盖住——两端都在打字时收起。
  const keyboardOpen = useKeyboardOpen()

  useEffect(() => {
    if (authed) return
    if (token) clearSessionToken()
    navigate('/login', { replace: true })
  }, [authed, token, navigate])

  if (!authed) {
    return null
  }

  return (
    <div className="layout">
      <div className="layout-page">
        {/* 凡是 layout 的二级路由都展示在这里 */}
        <Outlet />
      </div>

      <nav
        className={`bottom-nav${keyboardOpen ? ' is-keyboard-hidden' : ''}`}
        aria-hidden={keyboardOpen || undefined}
        inert={keyboardOpen}
      >
        {tabs.map(({ id, path, name, iconClass }) => (
          <button
            key={id}
            type="button"
            className={`bottom-nav__item ${activeTab === id ? 'is-active' : ''}`}
            onClick={() => navigate(path)}
          >
            <i
              className={`iconfont ${iconClass} bottom-nav__icon-font`}
              aria-hidden="true"
            />
            <span className="bottom-nav__label">{name}</span>
            <i className="bottom-nav__underline" aria-hidden="true" />
          </button>
        ))}
      </nav>
    </div>
  )
}
