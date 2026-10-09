import { useState } from 'react'
import Login from './Login'
import Register from './Register'
import '../styles/authPage.less'

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  const changeActiveTab = (tab, { phone, password }) => {
    setActiveTab(tab)
    setPhone(phone)
    setPassword(password)
  }

  return (
    <div className="app-root">
      <div className="cartoon-bg"></div>
      <div className="auth-card">
        <div className="auth-card-wrapper">
          <div className="auth-header">
            <div className="auth-logo">logo</div>
            <h1 className="auth-title">亲子教育 · 成长伴侣</h1>
            <p className="auth-subtitle">专注 0-12 岁亲子教育，科学陪伴每一天</p>
          </div>

          <div className="slider-container">
            <div className={`slider-button ${activeTab === 'register' ? 'slider-button--right' : ''}`}></div>
            <div className="slider-tabs">
              <button className={`slider-tab ${activeTab === 'login' ? 'slider-tab--active' : ''}`} onClick={() => { setActiveTab('login') }}>登录</button>
              <button className={`slider-tab ${activeTab === 'register' ? 'slider-tab--active' : ''}`} onClick={() => { setActiveTab('register') }}>注册</button>
            </div>
          </div>

          {/* 登录模块 */}
          {
            activeTab === 'login' ? (<Login user={{ phone, password }}></Login>) : (<Register changeActiveTab={changeActiveTab}></Register>)
          }

          <div className="social-login">
            <div className="divider">
              <div className="divider-line"></div>
              <div className="divider-text">第三方账号登录</div>
              <div className="divider-line"></div>
            </div>
            <div className="oauth-buttons">
              <button className='oauth-buttons__btn'>
                <i className='iconfont icon-weixin'></i>
              </button>
              <button className='oauth-buttons__btn'>
                <i className='iconfont icon-QQ'></i>
              </button>
              <button className='oauth-buttons__btn'>
                <i className='iconfont icon-mac'></i>
              </button>
            </div>
          </div>

          <div className="auth-footnote">
            <p>注册即表示您同意 <a href="#">《用户协议》</a> 和 <a href="#">《隐私政策》</a></p>
          </div>
        </div>
      </div>
    </div>
  )
}
