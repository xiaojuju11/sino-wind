import { useScholarScope } from '../utils/useScholarScope'
import { useEffect, useRef, useState } from 'react'
import { CloseOutline, DownlandOutline, SendOutline } from 'antd-mobile-icons'
import axios from '../http'
import { createScholarCertificate } from '../utils/scholarCertificate'
import '../styles/scholarEcosystem.less'
import { useScholarSheet } from '../utils/useScholarSheet'
import { scholarScope } from '../utils/scholarLetters'
import { guestGames } from '../utils/scholarAssets'

const SAGE_NAMES = { libai: '李白', sushi: '苏轼', liqingzhao: '李清照', wangyangming: '王阳明', dufu: '杜甫' }
function ScholarArchiveSession({ onClose }) {
  const sheet = useScholarSheet(onClose)
  const [data, setData] = useState(null), [page, setPage] = useState(1)
  const [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [preview, setPreview] = useState(null)
  const [revision, setRevision] = useState(0)
  const [localMode, setLocalMode] = useState(false)
  const sequence = useRef(0), alive = useRef(true)
  useEffect(() => { alive.current = true; sequence.current++; return () => { alive.current = false } }, [])
  useEffect(() => {
    let current = true
    const scope = scholarScope()
    if (scope === 'guest' || localMode) {
      const games = guestGames()
      setData({ records: games.slice((page - 1) * 8, page * 8), rank: '游客研习', meritPoints: 0, total: games.length, pageSize: 8 })
      setBusy(false); setNotice('本机游客文牒不兑换竞技积分；登录对局由服务器另行归档。')
      return
    }
    setBusy(true); setNotice('')
    axios.get('/api/deepseek/feihua/records', { params: { page, pageSize: 8 }, timeout: 15000 })
      .then(res => { if (current && scope === scholarScope()) setData(res.data.data) })
      .catch(() => { if (current) { setData(null); setNotice('藏牒暂未载入，请重新开卷') } })
      .finally(() => { if (current) setBusy(false) })
    return () => { current = false }
  }, [page, revision, localMode])
  useEffect(() => {
    const refresh = () => { sequence.current++; setPreview(null); setData(null); setRevision(n => n + 1) }
    for (const event of ['userInfoUpdated', 'scholarAssetsUpdated', 'storage', 'focus']) window.addEventListener(event, refresh)
    return () => { for (const event of ['userInfoUpdated', 'scholarAssetsUpdated', 'storage', 'focus']) window.removeEventListener(event, refresh) }
  }, [])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url) }, [preview])
  const open = async id => {
    const version = ++sequence.current
    const scope = scholarScope()
    setBusy(true); setNotice('')
    try {
      const response = scope === 'guest' || localMode ? { data: { data: guestGames().find(game => game.id === id) } } : await axios.get(`/api/deepseek/feihua/records/${id}`, { timeout: 15000 })
      if (scope !== scholarScope() || !alive.current) return
      const result = await createScholarCertificate(response.data.data)
      if (alive.current && sequence.current === version && scope === scholarScope()) setPreview({ ...result, id, url: URL.createObjectURL(result.blob) })
    } catch { if (alive.current) setNotice('文牒绘制未完成，请重试') }
    finally { if (alive.current) setBusy(false) }
  }
  const download = () => {
    const anchor = document.createElement('a'); anchor.href = preview.url; anchor.download = `飞花文牒-${preview.id}.png`; document.body.appendChild(anchor); anchor.click(); anchor.remove()
  }
  const share = async () => {
    try {
      if (typeof File !== 'function' || typeof navigator.share !== 'function') { download(); setNotice('当前浏览器暂不支持系统分享，已转为下载'); return }
      const file = new File([preview.blob], `飞花文牒-${preview.id}.png`, { type: 'image/png' })
      if (!navigator.canShare?.({ files: [file] })) { download(); setNotice('当前浏览器暂不支持系统分享，已转为下载'); return }
      await navigator.share({ title: '云山竹简 · 飞花文牒', files: [file] })
    } catch (e) { if (e.name !== 'AbortError') setNotice('分享未完成，可下载后分享') }
  }
  return <div className='scholar-sheet-backdrop'><section ref={sheet} className='scholar-sheet' role='dialog' aria-modal='true' aria-label='翰林藏牒阁'>
    <header><h2>翰林藏牒阁</h2><button onClick={onClose} aria-label='合卷'><CloseOutline /></button></header>
    {scholarScope().startsWith('user:') && <button type='button' disabled={busy} onClick={() => { sequence.current++; setPreview(null); setPage(1); setLocalMode(value => !value) }}>{localMode ? '查看账户文牒' : '查看本机游客研习'}</button>}
    <>
      <p>{data?.rank || '文阶待载入'} · {data?.meritPoints ?? '—'}分 · 已藏{data?.total ?? '—'}牒</p>
      <button type='button' disabled={busy} onClick={() => setRevision(n => n + 1)}>重新开卷</button>
      {notice && <p role='status'>{notice}</p>}{busy && <p role='status'>研墨开卷中…</p>}
      {preview ? <div className='scholar-certificate-preview'>
        <button onClick={() => setPreview(null)}>返回藏牒目录</button>
        <img src={preview.url} alt='飞花令历史文牒，原生Canvas二倍高清重绘' />
        <button onClick={download}><DownlandOutline /> 下载高清文牒</button><button onClick={share}><SendOutline /> 系统分享</button>
      </div> : <>
        {!busy && data?.total === 0 && <p>尚无已完成对局。前往知音席行一局飞花令，收局后即可入阁。</p>}
        {data?.records?.map(game => <button className='scholar-archive-card' key={game.id} onClick={() => open(game.id)} disabled={busy}>
          <strong>{SAGE_NAMES[game.sageId] || '先贤'} · 令「{game.keyword}」</strong>
          <span>{game.winner === 'user' ? '雅士胜' : game.winner === 'draw' ? '和局' : '先贤胜'} · {game.rhyme || '未定韵'} · 实得{game.pointsAwarded}分</span>
          <time>{new Date(game.endedAt).toLocaleString('zh-CN')}</time>
        </button>)}
        <nav aria-label='藏牒分页'><button disabled={page === 1 || busy} onClick={() => setPage(p => p - 1)}>前页</button><span>第{page}页</span><button disabled={!data || page * data.pageSize >= data.total || busy} onClick={() => setPage(p => p + 1)}>后页</button></nav>
      </>}
    </>
  </section></div>
}

export default function ScholarArchive(props) {
  const scope = useScholarScope()
  return <ScholarArchiveSession key={scope} {...props} />
}
