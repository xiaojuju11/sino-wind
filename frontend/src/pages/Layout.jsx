import '../styles/layout.less'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

// 🏮 公共底部导航（三栏：雅集 / 知音 / 书斋）
// 全量采用团队 Iconfont 国风矢量图标库（font_5241957）
//   · 雅集：icon-jingqu
//   · 知音：icon-message
//   · 书斋：icon-ziliao
// 纯矢量字形，随 currentColor 自然着色，完全消除位图依赖
const tabs = [
  { id: 'home', path: '/home', name: '雅集', iconClass: 'icon-jingqu' },
  { id: 'letters', path: '/letters', name: '知音', iconClass: 'icon-message' },
  { id: 'mine', path: '/mine', name: '书斋', iconClass: 'icon-ziliao' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const activeTab = tabs.find((tab) => pathname.startsWith(tab.path))?.id || 'home'

  return (
    <div className="layout">
      <div className="layout-page">
        {/* 凡是 layout 的二级路由都展示在这里 */}
        <Outlet />
      </div>

      <nav className="bottom-nav">
        {tabs.map(({ id, path, name, iconClass }) => {
          return (
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
          )
        })}
      </nav>
    </div>
  )
}
