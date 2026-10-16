import { useEffect, useState } from 'react'
import { FileOutline, DownlandOutline } from 'antd-mobile-icons'
import '../styles/recoveryCode.less'

export default function RecoveryCodeCard({ code, title = '请收好账号恢复码', onDone }) {
  const [saved, setSaved] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const warn = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('unavailable')
      await navigator.clipboard.writeText(code)
      setNotice('恢复码已复制，请存放到安全的位置。')
    } catch { setNotice('浏览器未允许复制，请长按或选中下方恢复码手动复制。') }
  }
  const download = () => {
    const blob = new Blob(['云山竹简 · 账号恢复码\n\n' + code + '\n\n此码可用于重置密码，使用一次或重新生成后失效。请勿与密码存放在一起，也不要发送给他人。\n'], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '云山竹简-账号恢复码.txt'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice('已发起下载，请确认文件保存成功后再继续。')
  }
  return <section className="recovery-code" aria-labelledby="recovery-code-title">
    <span className="recovery-code__seal" aria-hidden="true">密笺</span>
    <h2 id="recovery-code-title">{title}</h2>
    <p>恢复码仅在本次显示。遗忘密码时，可凭账号与此码找回；每次使用或重新生成后，旧码立即失效。</p>
    <label className="recovery-code__label" htmlFor="account-recovery-code">账号恢复码</label>
    <textarea id="account-recovery-code" className="recovery-code__value" value={code} readOnly rows={4} spellCheck={false} onFocus={(event) => event.target.select()} />
    <div className="recovery-code__actions">
      <button type="button" onClick={copy}><FileOutline aria-hidden="true" />复制密笺</button>
      <button type="button" onClick={download}><DownlandOutline aria-hidden="true" />下载留存</button>
    </div>
    <p className="recovery-code__warning">请单独妥善保存，不要与密码存放在一起，也不要向他人展示。</p>
    {notice && <p role="status">{notice}</p>}
    <label className="recovery-code__confirm"><input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} />我已安全保存这份恢复码</label>
    <button type="button" className="recovery-code__done" disabled={!saved} onClick={onDone}>已收好，继续</button>
  </section>
}
