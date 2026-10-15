import { useScholarScope } from '../utils/useScholarScope'
import { useEffect, useState } from 'react'
import { CloseOutline, DeleteOutline } from 'antd-mobile-icons'
import axios from '../http'
import '../styles/scholarEcosystem.less'
import { useScholarSheet } from '../utils/useScholarSheet'
import { scholarScope } from '../utils/scholarLetters'
import { localArtifacts, removeLocalArtifact } from '../utils/scholarAssets'

function ScholarArtifactDrawerSession({ onClose, onPick }) {
  const sheet = useScholarSheet(onClose)
  const [data, setData] = useState(null), [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [revision, setRevision] = useState(0)
  const [confirmId, setConfirmId] = useState(null)
  useEffect(() => {
    let current = true
    const scope = scholarScope()
    if (scope === 'guest') {
      setBusy(false); setNotice('')
      const rows = localArtifacts()
      setData({ artifacts: rows.slice((page - 1) * 12, page * 12), total: rows.length, pageSize: 12 })
      return
    }
    setBusy(true); setNotice('')
    axios.get('/api/deepseek/scholar/artifacts', { params: { page }, timeout: 10000 }).then(res => { if (current && scope === scholarScope()) setData(res.data.data) })
      .catch(() => { if (current) setNotice('宝鉴暂未开卷，请重试') }).finally(() => { if (current) setBusy(false) })
    return () => { current = false }
  }, [page, revision])
  useEffect(() => {
    const refresh = () => { setData(null); setConfirmId(null); setRevision(n => n + 1) }
    const events = ['scholarAssetsUpdated', 'storage', 'focus', 'userInfoUpdated']
    events.forEach(event => window.addEventListener(event, refresh))
    return () => events.forEach(event => window.removeEventListener(event, refresh))
  }, [])
  const remove = async id => {
    if (confirmId !== id) { setConfirmId(id); return }
    setBusy(true)
    const scope = scholarScope()
    try {
      if (scope === 'guest') removeLocalArtifact(id)
      else await axios.delete(`/api/deepseek/scholar/artifacts/${id}`, { timeout: 10000 })
      if (scope !== scholarScope()) return
      setConfirmId(null); setPage(1); setRevision(n => n + 1)
      window.dispatchEvent(new Event('scholarAssetsUpdated'))
    }
    catch { setNotice('暂未移出宝鉴，可稍后再试') }
    finally { setBusy(false) }
  }
  return <div className='scholar-sheet-backdrop'><section ref={sheet} className='scholar-sheet' role='dialog' aria-modal='true' aria-label='宝鉴藏品选择'>
    <header><h2>{onPick ? '携物入席 · 宝鉴' : '物溯宝鉴 · 已藏器物'}</h2><button onClick={onClose} aria-label='合上宝鉴'><CloseOutline /></button></header>
    <p>在此展读已保存的器物考释。识别结果是文化研习推演，年代仍待考证。</p>
    {scholarScope() === 'guest' && <p>游客藏品仅保留本机，登录后可在书斋确认收入本人账户。</p>}
    <>
      {busy && <p role='status'>开卷中…</p>}{notice && <p role='status'>{notice}</p>}
      {!busy && data?.total === 0 && <p>尚无已保存藏品，请前往识物保存一件器物。</p>}
      {data?.artifacts?.map(item => <article className='scholar-archive-card' key={item.id}>
        <h3>{item.name} · {item.dynasty || '年代待考'}</h3>
        <p>{item.degraded ? '待考 · 内置资料推演' : '识物研习记录 · 非文物鉴定'} · {new Date(item.at).toLocaleDateString('zh-CN')}</p>
        <details><summary>展开器物考释</summary><p>{item.description}</p></details>
        {onPick && <button disabled={busy} onClick={() => onPick(item)}>携此物求教</button>}
        <button disabled={busy} onClick={() => remove(item.id)}><DeleteOutline /> {confirmId === item.id ? '确认移出宝鉴' : '移出宝鉴'}</button>
        {confirmId === item.id && <button onClick={() => setConfirmId(null)}>保留</button>}
      </article>)}
      <nav aria-label='宝鉴分页'><button disabled={busy || page <= 1} onClick={() => setPage(n => n - 1)}>前页</button><span>第{page}页</span><button disabled={busy || !data || page * data.pageSize >= data.total} onClick={() => setPage(n => n + 1)}>后页</button></nav>
      {notice && <button onClick={() => setRevision(n => n + 1)}>重新开卷</button>}
    </>
  </section></div>
}

export default function ScholarArtifactDrawer(props) {
  const scope = useScholarScope()
  return <ScholarArtifactDrawerSession key={scope} {...props} />
}
