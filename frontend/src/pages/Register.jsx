import { EyeOutline, EyeInvisibleOutline } from 'antd-mobile-icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Toast } from 'antd-mobile'
import axios from '../http'
import '../styles/register.less'

export default function Register({ changeActiveTab, agreed = false, onRegistered }) {
  const [form, setForm] = useState({ nickname: '', phone: '', password: '', captchaCode: '' })
  const [captcha, setCaptcha] = useState(null)
  const [captchaLoading, setCaptchaLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const requestId = useRef(0)
  const mounted = useRef(false)
  const loadCaptcha = useCallback(async () => {
    const current = ++requestId.current
    setCaptcha(null)
    setCaptchaLoading(true)
    setForm((previous) => ({ ...previous, captchaCode: '' }))
    try {
      const { data } = await axios.get('/api/auth/captcha')
      if (current !== requestId.current) return
      if (typeof data?.captchaId !== 'string' || !data.captchaId.trim() || typeof data.captchaSvg !== 'string' || !data.captchaSvg.includes('<svg')) throw new Error('验证码响应异常')
      setCaptcha({ id: data.captchaId, image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data.captchaSvg) })
    } catch {
      if (current === requestId.current) setError('验证码加载失败，请点击右侧重新获取')
    } finally {
      if (current === requestId.current) setCaptchaLoading(false)
    }
  }, [])
  useEffect(() => {
    mounted.current = true
    loadCaptcha()
    return () => { mounted.current = false; requestId.current += 1 }
  }, [loadCaptcha])
  const update = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))
  async function submit(event) {
    event.preventDefault()
    if (busy.current) return
    const nickname = form.nickname.trim(), phone = form.phone.trim()
    const phoneRegex = /^1[3-9]\d{9}$/
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(?:qq\.com|163\.com|126\.com|sina\.(?:com|cn)|gmail\.com|foxmail\.com)$/i
    if (!nickname || nickname.length > 50) return setError('雅号须为 1–50 位字符')
    if (!phoneRegex.test(phone) && !emailRegex.test(phone)) return setError('请输入有效手机号或支持的邮箱')
    if (!/^.{6,20}$/.test(form.password)) return setError('通行密押须为 6–20 位字符')
    if (!captcha || !form.captchaCode.trim()) return setError('请获取并填写图形验真码')
    if (!agreed) return setError('请先勾选同意用户协议与隐私政策')
    busy.current = true
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.post('/api/auth/register', { nickname, phone, password: form.password, captchaId: captcha.id, captchaCode: form.captchaCode.trim() })
      if (!mounted.current) return
      setForm((previous) => ({ ...previous, password: '', captchaCode: '' }))
      if (typeof data?.recoveryCode === 'string' && data.recoveryCode && onRegistered) {
        onRegistered({ phone, recoveryCode: data.recoveryCode })
      } else {
        Toast.show({ content: '账号已创建，请登录后在账号设置中生成恢复码', duration: 3500 })
        changeActiveTab('login', { phone, password: '' })
      }
    } catch (failure) {
      if (!mounted.current) return
      setError(failure?.response?.data?.message || failure?.data?.message || '缔约未成功，请稍后重试')
      await loadCaptcha()
    } finally { busy.current = false; if (mounted.current) setLoading(false) }
  }
  return (
    <form className="auth-register" onSubmit={submit} noValidate aria-busy={loading}>
      <label className="auth-field"><span className="auth-field-icon" aria-hidden="true"><i className="iconfont icon-wode" /></span><span className="auth-sr-only">拟定雅号</span>
        <input name="nickname" autoComplete="nickname" maxLength={50} placeholder="拟定雅号" value={form.nickname} onChange={update('nickname')} disabled={loading} />
      </label>
      <label className="auth-field"><span className="auth-field-icon" aria-hidden="true"><i className="iconfont icon-zhanghao" /></span><span className="auth-sr-only">手机号或信箱</span>
        <input name="username" autoComplete="username" inputMode="email" placeholder="请输入手机号" value={form.phone} onChange={update('phone')} disabled={loading} />
      </label>
      <div className="auth-field auth-captcha-field"><label className="auth-sr-only" htmlFor="register-captcha">图形验真码</label>
        <span className="auth-field-icon" aria-hidden="true"><i className="iconfont icon-anquan" /></span>
        <input id="register-captcha" autoComplete="off" maxLength={4} placeholder="请输入验证码" value={form.captchaCode} onChange={update('captchaCode')} disabled={loading || captchaLoading} />
        <button type="button" className="auth-captcha" disabled={loading || captchaLoading} onClick={() => { setError(''); loadCaptcha() }} aria-label="刷新图形验证码" title="点击刷新">
          {captchaLoading ? '绘制中…' : captcha ? <img src={captcha.image} alt="图形验证码，点击刷新" /> : '获取验真码'}
        </button>
      </div>
      <div className="auth-field"><span className="auth-field-icon" aria-hidden="true"><i className="iconfont icon-mima" /></span><label className="auth-sr-only" htmlFor="register-password">设置通行密押</label>
        <input id="register-password" name="password" autoComplete="new-password" type={visible ? 'text' : 'password'} placeholder="请设置密码" value={form.password} onChange={update('password')} disabled={loading} />
        <button type="button" className="auth-eye" aria-label={visible ? '隐藏密码' : '显示密码'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOutline /> : <EyeInvisibleOutline />}</button>
      </div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button type="submit" className="auth-submit" disabled={loading || captchaLoading || !captcha}>{loading ? '正在缔约…' : '完成缔约'}</button>
    </form>
  )
}
