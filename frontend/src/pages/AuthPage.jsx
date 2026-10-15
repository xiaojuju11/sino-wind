import { useState } from 'react'
import { Toast } from 'antd-mobile'
import Login from './Login'
import Register from './Register'
import ThemeToggle from '../context/ThemeToggle'
import '../styles/authPage.less'

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('login')
  const [user, setUser] = useState({ phone: '', password: '' })
  const [agreed, setAgreed] = useState(false)
  const changeActiveTab = (tab, credentials) => {
    if (credentials) setUser(credentials)
    setActiveTab(tab)
  }
  const unavailable = (name) => Toast.show({ content: name + '暂未开放，请使用账号密码入席' })
  const selectTab = (tab) => { setUser({ phone: '', password: '' }); setActiveTab(tab) }

  return (
    <main className={"auth-page-root " + (activeTab === "register" ? "is-register" : "is-login")}>
      <section className="auth-paper" aria-label="华风雅集账号认证"><span className="auth-corner top-left" aria-hidden="true" /><span className="auth-corner top-right" aria-hidden="true" /><span className="auth-corner bottom-left" aria-hidden="true" /><span className="auth-corner bottom-right" aria-hidden="true" /><span className="auth-cloud cloud-left" aria-hidden="true" /><span className="auth-cloud cloud-right" aria-hidden="true" />
        <header className="auth-heading" style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', right: 0, top: '-0.1rem' }}>
            <ThemeToggle />
          </div>
          <div className="auth-seal" aria-label="華風"><span>華</span><span>風</span></div>
          <h1>云山竹简 · 华风雅集</h1>
          <p>读千年风雅 与君共此山河</p>
        </header>
        <div className="auth-tabs" role="tablist" aria-label="登录或注册">
          <span className={'auth-tab-stamp ' + (activeTab === 'register' ? 'is-register' : '')} aria-hidden="true" />
          {['login', 'register'].map((tab, i) => (
            <button key={tab} type="button" role="tab" id={'auth-tab-' + tab}
              aria-controls="auth-panel" aria-selected={activeTab === tab} tabIndex={activeTab === tab ? 0 : -1}
              onKeyDown={(event) => {
                if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                  event.preventDefault()
                  const next = event.key === 'Home' ? 'login' : event.key === 'End' ? 'register' : tab === 'login' ? 'register' : 'login'
                  selectTab(next)
                  document.getElementById('auth-tab-' + next)?.focus()
                }
              }}
              onClick={() => selectTab(tab)}>{i === 0 ? '入席' : '缔约'}</button>
          ))}
        </div>
        <div id="auth-panel" role="tabpanel" aria-labelledby={'auth-tab-' + activeTab} className="auth-panel" key={activeTab}>
          {activeTab === 'login'
            ? <Login user={user} agreed={agreed} />
            : <Register changeActiveTab={changeActiveTab} agreed={agreed} />}
        </div>
        <footer className="auth-footer">
          <p className="auth-divider"><span>第三方账号登录</span></p>
          <div className="auth-social">
            {[
              { name: '微信', icon: 'icon-weixin' },
              { name: 'QQ', icon: 'icon-QQ' },
              { name: 'Apple', icon: 'icon-mac' }
            ].map(({ name, icon }) => (
              <button type="button" key={name} aria-label={name + '登录（暂未开放）'} onClick={() => unavailable(name + '登录')}>
                <i className={`iconfont ${icon}`} aria-hidden="true" />
                <span>{name}</span>
              </button>
            ))}
          </div>
          <div className="auth-consent">
            <label><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} aria-label="同意用户协议与隐私政策" /><span>我已阅读并同意</span></label>
            <button type="button" onClick={() => Toast.show({ content: '《用户协议》正式内容待发布' })}>《用户协议》</button>
            <span>和</span>
            <button type="button" onClick={() => Toast.show({ content: '《隐私政策》正式内容待发布' })}>《隐私政策》</button>
          </div>
        </footer>
      </section>
    </main>
  )
}
