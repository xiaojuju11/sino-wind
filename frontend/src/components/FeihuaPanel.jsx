import { useEffect, useRef, useState } from 'react'
import { DownlandOutline, CloseOutline } from 'antd-mobile-icons'
import axios from '../http'
import { downloadScholarCertificate } from '../utils/scholarCertificate'

export default function FeihuaPanel({ sageId, onClose }) {
  const [rules, setRules] = useState(null), [game, setGame] = useState(null)
  const [keyword, setKeyword] = useState('月'), [rhyme, setRhyme] = useState('')
  const [line, setLine] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const [seconds, setSeconds] = useState(30)
  const live = useRef(false), lock = useRef(false), offset = useRef(0), guest = useRef(null), versionSent = useRef(null), retryAfter = useRef(0)
  useEffect(() => {
    live.current = true
    axios.get('/api/deepseek/feihua/rules').then(res => { if (live.current) setRules(res.data.data) })
      .catch(() => { if (live.current) setNotice('规则暂未载入，请稍后重新进入') })
    try {
      const saved = JSON.parse(sessionStorage.getItem(`feihua:${sageId}`) || 'null')
      if (saved?.id && Number.isSafeInteger(saved.version)) {
        guest.current = saved.guestKey
        axios.post('/api/deepseek/feihua/turn', { ...saved, action: 'timeout' }).then(res => {
          if (live.current) {
            offset.current = res.data.data.serverNow - Date.now()
            setGame(res.data.data)
          }
        }).catch(() => { if (live.current) { sessionStorage.removeItem(`feihua:${sageId}`); setNotice('上次对局已失效，可重新开局') } })
      }
    } catch { /* Storage can be unavailable; new games remain usable. */ }
    return () => { live.current = false }
  }, [sageId])
  const update = data => {
    offset.current = data.serverNow - Date.now()
    if (data.guestKey) guest.current = data.guestKey
    try { sessionStorage.setItem(`feihua:${sageId}`, JSON.stringify({ id: data.id, version: data.version, guestKey: guest.current })) } catch { /* optional local recovery */ }
    setGame(data); setNotice(data.feedback || '')
    if (data.settled) window.dispatchEvent(new Event('userInfoUpdated'))
  }
  const send = async (action) => {
    if (!game || lock.current) return
    lock.current = true; setBusy(true)
    try {
      const response = await axios.post('/api/deepseek/feihua/turn', { id: game.id, version: game.version, guestKey: guest.current, action, line })
      if (live.current) { update(response.data.data); if (response.data.data.version !== game.version) setLine('') }
    } catch { if (live.current) { setNotice('本轮未确认，请重试同步；积分不会重复结算'); versionSent.current = null; retryAfter.current = Date.now() + 3000 } }
    finally { lock.current = false; if (live.current) setBusy(false) }
  }
  // Absolute server deadline survives background-tab timer throttling.
  useEffect(() => {
    if (game?.status !== 'playing') return
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((game.deadline - Date.now() - offset.current) / 1000))
      setSeconds(remaining)
      if (!remaining && Date.now() >= retryAfter.current && versionSent.current !== game.version && !lock.current) { versionSent.current = game.version; send('timeout') }
    }
    tick(); const timer = setInterval(tick, 250)
    return () => clearInterval(timer)
    // send reads the same immutable round captured by this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game])
  const start = async () => {
    if (lock.current) return
    lock.current = true; setBusy(true); setNotice('')
    try {
      const response = await axios.post('/api/deepseek/feihua/start', { sageId, keyword, rhyme })
      if (live.current) { guest.current = null; versionSent.current = null; update(response.data.data); setLine('') }
    } catch { if (live.current) setNotice('开局失败，请确认后端和数据库迁移已就绪') }
    finally { lock.current = false; if (live.current) setBusy(false) }
  }
  return <section className='feihua-panel' aria-label='飞花令对弈'>
    <div className='feihua-heading'><h2>飞花令 · 对席</h2><button type='button' onClick={onClose} aria-label='返回对话'><CloseOutline /></button></div>
    <p>三十息应令，同韵续句，双方不可重复。先贤从公开经典题库应答；胜得三分、和局一分，败局不计分。未登录可体验，积分不入书斋。</p>
    {!game || game.status === 'finished' ? <div className='feihua-controls'>
      <label>令字<select value={keyword} onChange={e => { setKeyword(e.target.value); setRhyme('') }}>{(rules?.keywords || ['月']).map(k => <option key={k}>{k}</option>)}</select></label>
      <label>平水韵<select value={rhyme} onChange={e => setRhyme(e.target.value)}><option value=''>首句定韵</option>{(rules?.availableRhymes?.[keyword] || []).map(r => <option key={r}>{r}</option>)}</select></label>
      <button type='button' onClick={start} disabled={busy || !rules}>{game ? '再开一局' : '开席行令'}</button>
    </div> : <div className='feihua-round'><strong>令：{game.keyword} · {game.rhyme || '首句定韵'}</strong><span role='timer' aria-label='剩余秒数'>{seconds}秒</span></div>}
    {notice && <p role='status'>{notice}</p>}
    {game?.turns.map((t, i) => <blockquote key={i}><b>{t.role === 'user' ? '雅士' : game.sageId === 'libai' ? '太白' : '东坡'}：</b>{t.line}<small>〔{t.author}《{t.title}》〕</small></blockquote>)}
    {game?.status === 'playing' && <form onSubmit={e => { e.preventDefault(); send('submit') }}>
      <label>应令诗句<input value={line} maxLength={100} onChange={e => setLine(e.target.value)} autoComplete='off' placeholder='输入题库中的完整单句' /></label>
      <button type='submit' disabled={busy || !line.trim()}>应令</button><button type='button' disabled={busy} onClick={() => send('resign')}>揖让收局</button>
    </form>}
    {game?.status === 'finished' && <div className='feihua-outcome' role='status'>
      <h3>{game.winner === 'user' ? '雅士胜出' : game.winner === 'draw' ? '两席和局' : '先贤胜出'}</h3><p>{game.reason}</p>
      <p>本局书斋积分：{game.pointsAwarded || 0}</p>
      <button type='button' disabled={busy} onClick={async () => {
        setBusy(true)
        try { await downloadScholarCertificate(game) } catch (error) { setNotice(error.message) } finally { if (live.current) setBusy(false) }
      }}><DownlandOutline /> 导出2倍高清文牒</button>
    </div>}
    <details><summary>规则与经典题库（{rules?.poems.length || 0}句）</summary>
      <p>首个有效句确定韵部，此后句末须同部。多音字不猜读音，请开局指定韵部。不含令字、重句或错韵即负；未收录句不判负但计时继续。六轮完整唱和判和局；先贤无可应之句则雅士胜。离开页面不暂停，未结算不发积分。每局十五分钟后过期。</p>
      <p>韵表：<a href={rules?.source || 'https://zh.wikisource.org/zh-hans/平水韵'} target='_blank' rel='noreferrer'>平水韵106部</a>。仅校验本题库原句与句末韵部，不宣称自动鉴定全体诗词或多音字语境。</p>
      {rules?.poems.map(p => <p key={p.line}>{p.line} — {p.author}《{p.title}》</p>)}
    </details>
  </section>
}
