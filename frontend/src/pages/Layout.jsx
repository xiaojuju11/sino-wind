import '../styles/layout.less'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

// 🏮 公共底部导航（三栏：雅集 / 观藏 / 书斋）
// 器物图标使用设计稿切图（assets/tabbar/*），以 CSS mask + currentColor 着色，
// 因此激活态可直接随文字颜色变为朱砂红，无需第二套图片。
const BASE = import.meta.env.BASE_URL

const tabs = [
  { id: 'home', path: '/home', name: '雅集', icon: 'tabbar-yaji.png' },
  { id: 'letters', path: '/letters', name: '知音', icon: 'tabbar-guancang.png' },
  { id: 'mine', path: '/mine', name: '书斋', icon: 'tabbar-shuzhai.png' },
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
        {tabs.map(({ id, path, name, icon }) => {
          const iconUrl = `url(${BASE}assets/tabbar/${icon})`
          return (
            <button
              key={id}
              type="button"
              className={`bottom-nav__item ${activeTab === id ? 'is-active' : ''}`}
              onClick={() => navigate(path)}
            >
              <span
                className="bottom-nav__icon"
                style={{ WebkitMaskImage: iconUrl, maskImage: iconUrl }}
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
