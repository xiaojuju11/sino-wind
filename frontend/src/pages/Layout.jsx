import '../styles/layout.less'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { MailOpenOutline } from 'antd-mobile-icons'

// 🏮 公共底部导航（三栏：雅集 / 知音 / 书斋）
// 雅集、书斋仍用设计稿切图（assets/tabbar/*），以 CSS mask + currentColor 着色；
// 「知音」改用 antd-mobile-icons 矢量信札图标（MailOpenOutline）：
//   —— 原 tabbar-guancang.png 为「观藏器物」造型，与「知音（千古知己信札）」语义不符，
//   —— 矢量图标可随激活态直接变朱砂红，符合图标铁律（严禁 AI 生成位图图标）。
const BASE = import.meta.env.BASE_URL

const tabs = [
  { id: 'home', path: '/home', name: '雅集', icon: 'tabbar-yaji.png' },
  { id: 'letters', path: '/letters', name: '知音', Icon: MailOpenOutline },
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
        {tabs.map(({ id, path, name, icon, Icon }) => {
          const iconUrl = `url(${BASE}assets/tabbar/${icon})`
          return (
            <button
              key={id}
              type="button"
              className={`bottom-nav__item ${activeTab === id ? 'is-active' : ''}`}
              onClick={() => navigate(path)}
            >
              {Icon ? (
                <Icon
                  className="bottom-nav__icon-svg"
                  style={{ fontSize: '0.5rem', color: 'inherit' }}
                  aria-hidden="true"
                />
              ) : (
                <span
                  className="bottom-nav__icon"
                  style={{ WebkitMaskImage: iconUrl, maskImage: iconUrl }}
                  aria-hidden="true"
                />
              )}
              <span className="bottom-nav__label">{name}</span>
              <i className="bottom-nav__underline" aria-hidden="true" />
            </button>
          )
        })}
      </nav>
    </div>
  )
}
