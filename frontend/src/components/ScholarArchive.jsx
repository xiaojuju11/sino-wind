import { useScholarScope } from '../utils/useScholarScope'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CloseOutline, DownlandOutline, SendOutline, RedoOutline, RightOutline } from 'antd-mobile-icons'
import axios from '../http'
import { createScholarCertificate } from '../utils/scholarCertificate'
import '../styles/scholarEcosystem.less'
import ScholarSurface from './ScholarSurface'
import EmptyState from './EmptyState'
import { scholarScope } from '../utils/scholarLetters'
import { guestGames } from '../utils/scholarAssets'

const SAGE_NAMES = { libai: '李白', sushi: '苏轼', liqingzhao: '李清照', wangyangming: '王阳明', dufu: '杜甫', xinqiji: '辛弃疾' }
function ScholarArchiveSession({ onClose, presentation }) {
  const navigate = useNavigate()
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

  const scope = scholarScope()
  const isUser = scope.startsWith('user:')

  return <ScholarSurface presentation={presentation} onClose={onClose} label='翰林藏牒阁'>
    {presentation !== 'page' && <header className='scholar-archive-tophead'><h2>翰林藏牒阁</h2><button type='button' onClick={onClose} aria-label='合卷'><CloseOutline /></button></header>}
    
    {/* 雅士修持卡片 */}
    <div className='scholar-summary-banner'>
      <div className='scholar-summary-banner__info'>
        <span className='scholar-summary-banner__rank'>{data?.rank || '文士研习'}</span>
        <span className='scholar-summary-banner__divider'>·</span>
        <span className='scholar-summary-banner__points'>{data?.meritPoints ?? 0} 修持分</span>
        <span className='scholar-summary-banner__divider'>·</span>
        <span className='scholar-summary-banner__count'>已藏 {data?.total ?? 0} 牒</span>
      </div>
      <div className='scholar-summary-banner__actions'>
        {isUser && (
          <button type='button' className='scholar-capsule-btn' disabled={busy} onClick={() => { sequence.current++; setPreview(null); setPage(1); setLocalMode(v => !v) }}>
            {localMode ? '返回账户文牒' : '查看游客对局'}
          </button>
        )}
        <button type='button' className='scholar-icon-refresh-btn' disabled={busy} onClick={() => setRevision(n => n + 1)} aria-label='重新展卷'>
          <RedoOutline className={busy ? 'is-spinning' : ''} />
        </button>
      </div>
    </div>

    {notice && <p className='scholar-status-notice' role='status'>{notice}</p>}
    {busy && <div className='scholar-loading-hint' role='status'><RedoOutline className='is-spinning' /> 研墨展卷中…</div>}

    {preview ? (
      <div className='scholar-certificate-preview'>
        <button type='button' className='scholar-return-btn' onClick={() => setPreview(null)}>← 返回藏牒目录</button>
        <div className='scholar-certificate-frame'>
          <img src={preview.url} alt='飞花令历史文牒，原生Canvas高清重绘' />
        </div>
        <div className='scholar-certificate-actions'>
          <button type='button' className='scholar-action-btn primary' onClick={download}><DownlandOutline /> 下载高清文牒</button>
          <button type='button' className='scholar-action-btn' onClick={share}><SendOutline /> 分享墨卷</button>
        </div>
      </div>
    ) : (
      <>
        {!busy && data?.total === 0 && (
          <EmptyState
            seal='待战'
            title='案上尚无飞花文牒'
            desc={localMode ? '本机暂无游客研习对局。' : '入席与千古先贤行一局飞花令，收局后无论胜负皆录入文牒，存藏翰林。'}
            actionText='前往飞花对弈'
            onAction={() => {
              if (presentation === 'drawer' && onClose) onClose()
              navigate('/letters')
            }}
          />
        )}

        <div className='scholar-records-list'>
          {data?.records?.map(game => {
            const isWin = game.winner === 'user'
            const isDraw = game.winner === 'draw'
            return (
              <button className='scholar-archive-card' key={game.id} onClick={() => open(game.id)} disabled={busy} type='button'>
                <div className='scholar-archive-card__left'>
                  <div className='scholar-archive-card__title'>
                    <strong>{SAGE_NAMES[game.sageId] || '先贤'} · 令「{game.keyword}」</strong>
                    <span className={`scholar-result-tag ${isWin ? 'win' : isDraw ? 'draw' : 'lose'}`}>
                      {isWin ? '雅士拔筹' : isDraw ? '平分秋色' : '先贤折桂'}
                    </span>
                  </div>
                  <div className='scholar-archive-card__meta'>
                    <span>韵部：{game.rhyme || '不限韵'}</span>
                    <span>·</span>
                    <span>实得 {game.pointsAwarded} 分</span>
                  </div>
                  <time className='scholar-archive-card__time'>{new Date(game.endedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</time>
                </div>
                <div className='scholar-archive-card__right'>
                  <span className='scholar-archive-card__action'>展牒 <RightOutline /></span>
                </div>
              </button>
            )
          })}
        </div>

        {data?.total > (data?.pageSize || 8) && (
          <nav className='scholar-pagination' aria-label='藏牒分页'>
            <button type='button' disabled={page === 1 || busy} onClick={() => setPage(p => p - 1)}>前页</button>
            <span className='scholar-pagination__current'>第 {page} 页 / 共 {Math.ceil(data.total / data.pageSize)} 页</span>
            <button type='button' disabled={!data || page * data.pageSize >= data.total || busy} onClick={() => setPage(p => p + 1)}>后页</button>
          </nav>
        )}
      </>
    )}
  </ScholarSurface>
}

export default function ScholarArchive(props) {
  const scope = useScholarScope()
  return <ScholarArchiveSession key={scope} {...props} />
}
