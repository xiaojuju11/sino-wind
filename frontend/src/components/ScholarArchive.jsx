import { useEffect, useRef, useState } from 'react'
import { CloseOutline, DownlandOutline, SendOutline } from 'antd-mobile-icons'
import axios from '../http'
import { createScholarCertificate } from '../utils/scholarCertificate'
import '../styles/scholarEcosystem.less'

const SAGE_NAMES = { libai: '李白', sushi: '苏轼', liqingzhao: '李清照', wangyangming: '王阳明', dufu: '杜甫' }
export default function ScholarArchive({ onClose }) {
  const [data, setData] = useState(null), [page, setPage] = useState(1)
  const [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [preview, setPreview] = useState(null)
  const sequence = useRef(0), alive = useRef(true)
  useEffect(() => { alive.current = true; sequence.current++; return () => { alive.current = false } }, [])
  useEffect(() => {
    let current = true
    if (!localStorage.getItem('token')) return
    setBusy(true); setNotice('')
    axios.get('/api/deepseek/feihua/records', { params: { page, pageSize: 8 }, timeout: 15000 })
      .then(res => { if (current) setData(res.data.data) })
      .catch(() => { if (current) setNotice('藏牒暂未载入，请重新开卷') })
      .finally(() => { if (current) setBusy(false) })
    return () => { current = false }
  }, [page])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url) }, [preview])
  const open = async id => {
    const version = ++sequence.current
    setBusy(true); setNotice('')
    try {
      const response = await axios.get(`/api/deepseek/feihua/records/${id}`, { timeout: 15000 })
      const result = await createScholarCertificate(response.data.data)
      if (alive.current && sequence.current === version) setPreview({ ...result, id, url: URL.createObjectURL(result.blob) })
    } catch { if (alive.current) setNotice('文牒绘制未完成，请重试') }
    finally { if (alive.current) setBusy(false) }
  }
  const download = () => {
    const anchor = document.createElement('a'); anchor.href = preview.url; anchor.download = `飞花文牒-${preview.id}.png`; anchor.click()
  }
  const share = async () => {
    const file = new File([preview.blob], `飞花文牒-${preview.id}.png`, { type: 'image/png' })
    if (!navigator.canShare?.({ files: [file] })) { download(); setNotice('当前浏览器暂不支持系统分享，已转为下载'); return }
    try { await navigator.share({ title: '云山竹简 · 飞花文牒', files: [file] }) }
    catch (e) { if (e.name !== 'AbortError') setNotice('分享未完成，可下载后分享') }
  }
  return <div className='scholar-sheet-backdrop'><section className='scholar-sheet' role='dialog' aria-modal='true' aria-label='翰林藏牒阁'>
    <header><h2>翰林藏牒阁</h2><button onClick={onClose} aria-label='合卷'><CloseOutline /></button></header>
    {!localStorage.getItem('token') ? <p>请先登录，登录后的已完成对局将自动入阁。</p> : <>
      <p>{data?.rank || '修持文阶'} · {data?.meritPoints ?? 0}分 · 已藏{data?.total ?? 0}牒</p>
      {notice && <p role='status'>{notice}</p>}{busy && <p role='status'>研墨开卷中…</p>}
      {preview ? <div className='scholar-certificate-preview'>
        <button onClick={() => setPreview(null)}>返回藏牒目录</button>
        <img src={preview.url} alt='飞花令历史文牒，原生Canvas二倍高清重绘' />
        <button onClick={download}><DownlandOutline /> 下载高清文牒</button><button onClick={share}><SendOutline /> 系统分享</button>
      </div> : <>
        {!busy && data?.total === 0 && <p>尚无已完成对局。前往知音席行一局飞花令，收局后即可入阁。</p>}
        {data?.records.map(game => <button className='scholar-archive-card' key={game.id} onClick={() => open(game.id)} disabled={busy}>
          <strong>{SAGE_NAMES[game.sageId] || '先贤'} · 令「{game.keyword}」</strong>
          <span>{game.winner === 'user' ? '雅士胜' : game.winner === 'draw' ? '和局' : '先贤胜'} · {game.rhyme || '未定韵'} · 实得{game.pointsAwarded}分</span>
          <time>{new Date(game.endedAt).toLocaleString('zh-CN')}</time>
        </button>)}
        <nav aria-label='藏牒分页'><button disabled={page === 1 || busy} onClick={() => setPage(p => p - 1)}>前页</button><span>第{page}页</span><button disabled={!data || page * data.pageSize >= data.total || busy} onClick={() => setPage(p => p + 1)}>后页</button></nav>
      </>}
    </>}
  </section></div>
}
