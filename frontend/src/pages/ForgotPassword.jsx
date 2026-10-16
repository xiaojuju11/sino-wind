import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EyeOutline, EyeInvisibleOutline, LeftOutline } from 'antd-mobile-icons'
import axios from '../http'
import InkWashBackground from '../components/InkWashBackground'
import RecoveryCodeCard from '../components/RecoveryCodeCard'
import '../styles/authPage.less'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ phone: '', recoveryCode: '', newPassword: '', confirmPassword: '' })
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newCode, setNewCode] = useState('')
  const busy = useRef(false)
  const active = useRef(false)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  const update = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    if (busy.current) return
    const account = form.phone.trim()
    const phoneRegex = /^1[3-9]\d{9}$/
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(?:qq\.com|163\.com|126\.com|sina\.(?:com|cn)|gmail\.com|foxmail\.com)$/i
    if (!phoneRegex.test(account) && !emailRegex.test(account)) return setError('请输入注册时使用的有效手机号或支持的邮箱')
    const recoveryCode = form.recoveryCode.replace(/[\s-]/g, '')
    if (!/^[a-f\d]{48}$/i.test(recoveryCode)) return setError('请填写完整恢复码：共 8 组，每组 6 位，允许空格或连字符')
    if (!/^.{6,20}$/.test(form.newPassword)) return setError('新密码须为 6–20 位字符')
    if (form.newPassword !== form.confirmPassword) return setError('两次输入的新密码不一致')
    setError('')
    busy.current = true
    setLoading(true)
    try {
      const { data } = await axios.post('/api/auth/recovery/reset', { phone: form.phone.trim(), recoveryCode, newPassword: form.newPassword })
      if (!active.current) return
      if (typeof data?.data?.recoveryCode !== 'string' || !data.data.recoveryCode) {
        setForm({ phone: '', recoveryCode: '', newPassword: '', confirmPassword: '' })
        setError('密码已重置，但新恢复码未能显示。请使用新密码登录后，在账号设置重新生成恢复码。')
        return
      }
      setForm({ phone: '', recoveryCode: '', newPassword: '', confirmPassword: '' })
      setNewCode(data.data.recoveryCode)
    } catch (failure) {
      if (active.current) setError(failure?.response?.data?.message || failure?.data?.message || '重置未完成，请核对账号与恢复码后再试')
    } finally {
      busy.current = false
      if (active.current) setLoading(false)
    }
  }
  return <main className="auth-page-root is-recovery">
    <InkWashBackground />
    <p className="auth-landscape-caption" aria-hidden="true">循笺归来 · 重启雅席</p>
    <section className="auth-paper" aria-label="找回账号密码">
      <span className="auth-corner top-left" aria-hidden="true" /><span className="auth-corner top-right" aria-hidden="true" /><span className="auth-corner bottom-left" aria-hidden="true" /><span className="auth-corner bottom-right" aria-hidden="true" />
      {newCode ? <RecoveryCodeCard code={newCode} title="密码已重置，请收好新密笺" onDone={() => { setNewCode(''); navigate('/login', { replace: true }) }} /> : <>
        <Link className="auth-back" to="/login"><LeftOutline aria-hidden="true" />返回入席</Link>
        <header className="auth-heading auth-recovery-heading"><div className="auth-seal" aria-hidden="true"><span>归</span><span>席</span></div><h1>凭笺重启 · 找回密码</h1><p>以恢复密笺，续一席风雅</p></header>
        <p className="auth-recovery-intro">填写账号与已保存的恢复码。验证成功后会更换密码，并签发一份新的恢复码。</p>
        <form className="auth-recovery-form" onSubmit={submit} aria-busy={loading} noValidate>
          <label className="auth-recovery-label" htmlFor="recover-account">注册账号</label>
          <div className="auth-field"><input id="recover-account" name="username" autoComplete="username" inputMode="email" placeholder="注册时使用的手机号或邮箱" value={form.phone} onChange={update('phone')} disabled={loading} /></div>
          <label className="auth-recovery-label" htmlFor="recover-code">账号恢复码</label>
          <div className="auth-field"><textarea id="recover-code" autoComplete="off" autoCapitalize="characters" spellCheck={false} rows={3} placeholder="请输入保存的 8 组恢复码" value={form.recoveryCode} onChange={update('recoveryCode')} disabled={loading} /></div>
          <label className="auth-recovery-label" htmlFor="recover-password">新密码</label>
          <div className="auth-field"><input id="recover-password" autoComplete="new-password" type={visible ? 'text' : 'password'} placeholder="6–20 位字符" value={form.newPassword} onChange={update('newPassword')} disabled={loading} /><button type="button" className="auth-eye" aria-label={visible ? '隐藏新密码' : '显示新密码'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOutline /> : <EyeInvisibleOutline />}</button></div>
          <label className="auth-recovery-label" htmlFor="recover-confirm">确认新密码</label>
          <div className="auth-field"><input id="recover-confirm" autoComplete="new-password" type={visible ? 'text' : 'password'} placeholder="再次输入新密码" value={form.confirmPassword} onChange={update('confirmPassword')} disabled={loading} /></div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>{loading ? '正在核验密笺…' : '验证密笺 · 重设密码'}</button>
        </form>
        <aside className="auth-recovery-help"><strong>还没有恢复码？</strong><p>旧账号需先登录，在「书斋 → 账号设置 → 账号恢复码」生成并保存。若已无法登录且没有恢复码，请联系云山竹简项目团队核验身份；不能仅凭手机号重置密码。</p></aside>
      </>}
    </section>
  </main>
}
