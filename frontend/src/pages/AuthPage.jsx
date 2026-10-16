import { useState } from 'react'
import { Link } from 'react-router-dom'
import Login from './Login'
import Register from './Register'
import InkWashBackground from '../components/InkWashBackground'
import RecoveryCodeCard from '../components/RecoveryCodeCard'
import '../styles/authPage.less'

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('login')
  const [user, setUser] = useState({ phone: '', password: '' })
  const [agreed, setAgreed] = useState(false)
  const [recovery, setRecovery] = useState(null)
  const changeActiveTab = (tab, credentials) => {
    if (credentials) setUser(credentials)
    setActiveTab(tab)
  }
  const selectTab = (tab) => { setUser({ phone: '', password: '' }); setActiveTab(tab) }

  return (
    <main className={"auth-page-root " + (activeTab === "register" ? "is-register" : "is-login")}>
      <InkWashBackground />
      <p className="auth-landscape-caption" aria-hidden="true">一卷山河 · 静候君来</p>
      <section className="auth-paper" aria-label="华风雅集账号认证"><span className="auth-corner top-left" aria-hidden="true" /><span className="auth-corner top-right" aria-hidden="true" /><span className="auth-corner bottom-left" aria-hidden="true" /><span className="auth-corner bottom-right" aria-hidden="true" /><span className="auth-cloud cloud-left" aria-hidden="true" /><span className="auth-cloud cloud-right" aria-hidden="true" />
        <header className="auth-heading">
          <div className="auth-seal" aria-label="華風"><span>華</span><span>風</span></div>
          <h1>云山竹简 · 华风雅集</h1>
          <p>读千年风雅 与君共此山河</p>
        </header>
        {recovery ? <RecoveryCodeCard code={recovery.recoveryCode} title="缔约已成，请收好密笺" onDone={() => {
          setUser({ phone: recovery.phone, password: '' })
          setRecovery(null)
          setActiveTab('login')
        }} /> : <>
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
            : <Register changeActiveTab={changeActiveTab} agreed={agreed} onRegistered={setRecovery} />}
        </div>
        <footer className="auth-footer">
          <div className="auth-consent">
            <label><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} aria-label="同意用户协议与隐私政策" /><span>我已阅读并同意</span></label>
            <Link to="/legal/terms" target="_blank" rel="noopener noreferrer">《用户协议》</Link>
            <span>和</span>
            <Link to="/legal/privacy" target="_blank" rel="noopener noreferrer">《隐私政策》</Link>
          </div>
          <p className="auth-reading-note">协议在新页打开，阅读后返回此页继续</p>
        </footer>
        </>}
      </section>
    </main>
  )
}
