import { useEffect, useRef, useState } from 'react'
import { Toast } from 'antd-mobile'
import { EyeOutline, EyeInvisibleOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import axios from '../http'
import '../styles/login.less'

export default function Login({ user = {}, agreed = false }) {
  const [phone, setPhone] = useState(user.phone || '')
  const [password, setPassword] = useState(user.password || '')
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const navigate = useNavigate()
  async function submit(event) {
    event.preventDefault()
    if (busy.current) return
    const account = phone.trim()
    const phoneRegex = /^1[3-9]\d{9}$/
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(?:qq\.com|163\.com|126\.com|sina\.(?:com|cn)|gmail\.com|foxmail\.com)$/i
    if (!phoneRegex.test(account) && !emailRegex.test(account)) return setError('请输入有效手机号或支持的邮箱')
    if (!/^.{6,20}$/.test(password)) return setError('通行密押须为 6–20 位字符')
    if (!agreed) return setError('请先勾选同意用户协议与隐私政策')
    busy.current = true
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.post('/api/auth/login', { phone: account, password })
      if (!mounted.current) return
      if (typeof data?.token !== 'string' || !data.token.trim()) throw new Error('登录响应缺少凭证，请稍后重试')
      localStorage.setItem('token', data.token)
      setPassword('')
      navigate('/home', { replace: true })
    } catch (failure) {
      if (!mounted.current) return
      setError(failure?.response?.data?.message || failure?.data?.message || '入席未成功，请核对账号密押或稍后重试')
    } finally { busy.current = false; if (mounted.current) setLoading(false) }
  }
  return (
    <form className="auth-login" onSubmit={submit} noValidate aria-busy={loading}>
      <label className="auth-field"><span className="auth-field-icon" aria-hidden="true"><i className="iconfont icon-zhanghao" /></span><span className="auth-sr-only">手机号或信箱</span>
        <input name="username" autoComplete="username" type="text" inputMode="email" placeholder="请输入手机号" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} aria-describedby={error ? 'login-error' : undefined} />
      </label>
      <div className="auth-field"><span className="auth-field-icon" aria-hidden="true"><i className="iconfont icon-mima" /></span>
        <label className="auth-sr-only" htmlFor="login-password">通行密押</label>
        <input id="login-password" name="password" autoComplete="current-password" type={visible ? 'text' : 'password'} placeholder="请输入密码" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
        <button type="button" className="auth-eye" aria-label={visible ? '隐藏密码' : '显示密码'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOutline /> : <EyeInvisibleOutline />}</button>
      </div>
      <div className="auth-forgot"><button type="button" onClick={() => Toast.show({ content: '密码找回暂未开放，请联系管理员' })}>忘记密码？</button></div>
      {error && <p className="auth-error" id="login-error" role="alert">{error}</p>}
      <button className="auth-submit" disabled={loading} type="submit">{loading ? '正在入席…' : '落座入席'}</button>
    </form>
  )
}
